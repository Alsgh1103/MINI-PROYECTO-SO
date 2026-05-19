import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayArrow, Pause, SkipNext, RestartAlt, Add, Delete } from '@mui/icons-material';
import { 
  ThemeProvider, createTheme, CssBaseline, 
  Box, Container, Grid, Paper, Typography, 
  TextField, Select, MenuItem, Switch, 
  FormControlLabel, Button, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, FormControl, InputLabel,
  Divider
} from '@mui/material';

const COLORES = ['#3b82f6','#a78bfa','#34d399','#f59e0b','#f87171','#38bdf8','#fb7185','#818cf8'];

// Tema oscuro corporativo
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#3b82f6', dark: '#2563eb', light: '#60a5fa' },
    secondary: { main: '#60a5fa' },
    error: { main: '#ef4444' },
    success: { main: '#22c55e' },
    warning: { main: '#f59e0b' },
    background: { default: '#0a0a0a', paper: '#424242' },
    divider: '#222222',
    text: { primary: '#f8fafc', secondary: '#71717a' }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 800 },
    h6: { fontWeight: 600 }
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #222222',
          borderRadius: 12
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: '#222222' },
        head: { fontWeight: 600, color: '#71717a' }
      }
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: `
            radial-gradient(ellipse 130% 110% at 15% 5%, rgba(59,130,246,0.75) 0%, transparent 55%),
            radial-gradient(ellipse 110% 100% at 85% 95%, rgba(99,102,241,0.65) 0%, transparent 55%),
            radial-gradient(ellipse 100% 90% at 50% 50%, rgba(59,130,246,0.40) 0%, transparent 65%),
            radial-gradient(ellipse 160% 130% at 0% 50%, rgba(37,99,235,0.35) 0%, transparent 60%),
            #0c1a35
          `,
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
        },
        'input[type=number]': {
          MozAppearance: 'textfield',
        },
        'input[type=number]::-webkit-outer-spin-button': {
          WebkitAppearance: 'none',
          margin: 0,
        },
        'input[type=number]::-webkit-inner-spin-button': {
          WebkitAppearance: 'none',
          margin: 0,
        },
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#222222' }
      }
    }
  }
});

function AppContent() {
  const [procesos, setProcesos] = useState([]);
  const [bloquesRAM, setBloquesRAM] = useState([]);
  const [tiempo, setTiempo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [config, setConfig] = useState({
    capacidad: 100,
    criterio: 'fifo',
    defrag: false
  });

  const [form, setForm] = useState({ llegada: '', tamano: '', duracion: '' });

  const intentarAsignar = useCallback((proceso, ramActual) => {
    if (proceso.tamano > config.capacidad) return { exito: false, nuevaRam: ramActual };

    let clonRam = [...ramActual].sort((a, b) => a.start - b.start);
    let currentStart = 0;

    // Buscar hueco directo
    for (let i = 0; i < clonRam.length; i++) {
      let gap = clonRam[i].start - currentStart;
      if (gap >= proceso.tamano) {
        clonRam.push({ id: proceso.id, pid: proceso.pid, start: currentStart, size: proceso.tamano, color: proceso.color });
        return { exito: true, nuevaRam: clonRam };
      }
      currentStart = clonRam[i].start + clonRam[i].size;
    }

    if (config.capacidad - currentStart >= proceso.tamano) {
      clonRam.push({ id: proceso.id, pid: proceso.pid, start: currentStart, size: proceso.tamano, color: proceso.color });
      return { exito: true, nuevaRam: clonRam };
    }

    // Desfragmentación
    let ocupado = clonRam.reduce((acc, b) => acc + b.size, 0);
    if (config.capacidad - ocupado >= proceso.tamano && config.defrag) {
      let newStart = 0;
      let ramDefrag = clonRam.map(b => {
        let actual = newStart;
        newStart += b.size;
        return { ...b, start: actual };
      });
      ramDefrag.push({ id: proceso.id, pid: proceso.pid, start: newStart, size: proceso.tamano, color: proceso.color });
      return { exito: true, nuevaRam: ramDefrag };
    }

    return { exito: false, nuevaRam: ramActual };
  }, [config]);

  const avanzarPaso = useCallback(() => {
    let nuevosProcesos = [...procesos];
    let nuevaRam = [...bloquesRAM];

    // 1. Liberar procesos terminados
    nuevosProcesos.forEach(p => {
      if (p.estado === 'En RAM' && p.salida !== null && p.salida <= tiempo) {
        nuevaRam = nuevaRam.filter(b => b.id !== p.id);
        p.estado = 'Terminado';
      }
    });

    // 2. Actualizar a 'En Cola'
    nuevosProcesos.forEach(p => {
      if (p.llegada <= tiempo && p.estado === 'Pendiente') p.estado = 'En Cola';
    });

    // 3. Ordenar cola según criterio
    let enCola = nuevosProcesos.filter(p => p.estado === 'En Cola');
    enCola.sort((a, b) => {
      if (config.criterio === 'fifo') return a.llegada - b.llegada || a.pid.localeCompare(b.pid);
      if (config.criterio === 'min') return a.tamano - b.tamano || a.llegada - b.llegada;
      if (config.criterio === 'max') return b.tamano - a.tamano || a.llegada - b.llegada;
      return 0;
    });

    // 4. Intentar asignar
    let asignado;
    do {
      asignado = false;
      for (let i = 0; i < enCola.length; i++) {
        let p = enCola[i];
        let resultado = intentarAsignar(p, nuevaRam);
        if (resultado.exito) {
          nuevaRam = resultado.nuevaRam;
          let pIndex = nuevosProcesos.findIndex(x => x.pid === p.pid);
          nuevosProcesos[pIndex].estado = 'En RAM';
          nuevosProcesos[pIndex].salida = tiempo + p.duracion;
          enCola.splice(i, 1);
          asignado = true;
          break;
        }
      }
    } while (asignado);

    setBloquesRAM(nuevaRam);
    setProcesos(nuevosProcesos);
    setTiempo(prev => prev + 1);
  }, [procesos, bloquesRAM, tiempo, config, intentarAsignar]);

  // Bucle del reloj automático
  useEffect(() => {
    let intervalo = null;
    if (isPlaying) {
      intervalo = setInterval(() => {
        avanzarPaso();
      }, 1000);
    }
    return () => clearInterval(intervalo);
  }, [isPlaying, avanzarPaso]);

  const agregarProceso = () => {
    if (form.llegada === '' || form.tamano === '' || form.duracion === '') return;
    
    const llegada = Number(form.llegada);
    const tamano = Number(form.tamano);
    const duracion = Number(form.duracion);

    if (!Number.isInteger(llegada) || !Number.isInteger(tamano) || !Number.isInteger(duracion)) {
      alert("No se permiten decimales. Ingrese valores enteros.");
      return;
    }
    if (llegada < 0 || tamano <= 0 || duracion <= 0) {
      alert("La llegada no puede ser negativa. El tamaño y duración deben ser mayores a 0.");
      return;
    }

    setProcesos(prev => [...prev, {
      id: Date.now() + Math.random(),
      pid: `P${prev.length + 1}`,
      llegada: llegada,
      tamano: tamano,
      duracion: duracion,
      salida: null,
      estado: 'Pendiente',
      color: COLORES[prev.length % COLORES.length]
    }]);
    
    setForm({ llegada: '', tamano: '', duracion: '' });
  };

  const eliminarProceso = (pidParaEliminar) => {
    setProcesos(prev => {
      const remaining = prev.filter(p => p.pid !== pidParaEliminar);
      return remaining.map((p, idx) => ({ ...p, pid: `P${idx + 1}`, color: COLORES[idx % COLORES.length] }));
    });
  };

  const reiniciar = () => {
    setIsPlaying(false);
    setTiempo(0);
    setBloquesRAM([]);
    setProcesos(procesos.map(p => ({ ...p, estado: 'Pendiente', salida: null })));
  };

  const renderBadge = (estado) => {
    let bgColor = '#1c1c1c';
    let color = '#71717a';
    
    if (estado === 'En Cola')   { bgColor = 'rgba(245,158,11,0.12)';  color = '#fbbf24'; }
    if (estado === 'En RAM')    { bgColor = 'rgba(34,197,94,0.12)';   color = '#4ade80'; }
    if (estado === 'Terminado') { bgColor = 'rgba(59,130,246,0.12)';  color = '#60a5fa'; }
    
    return (
      <Box sx={{ 
        px: 1, py: 0.5, borderRadius: 5, display: 'inline-block',
        backgroundColor: bgColor, color: color, fontSize: '0.75rem', fontWeight: 'bold',
        minWidth: '85px', textAlign: 'center'
      }}>
        {estado}
      </Box>
    );
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      pt: 4,
      pb: 8,
      backgroundColor: '#0a0a0a',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        width: '110vw',
        height: '110vh',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 30% 30%, rgba(59,130,246,0.18) 0%, transparent 65%)',
        top: '-20vh',
        left: '-10vw',
        pointerEvents: 'none',
        zIndex: 0,
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        width: '100vw',
        height: '100vh',
        borderRadius: '50%',
        background: 'radial-gradient(ellipse at 70% 70%, rgba(99,102,241,0.13) 0%, transparent 65%)',
        bottom: '-10vh',
        right: '-10vw',
        pointerEvents: 'none',
        zIndex: 0,
      }
    }}>
      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        
        {/* Header Principal */}
        <Paper elevation={3} sx={{ p: 3, mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1" sx={{
            fontFamily: '"Outfit", sans-serif',
            letterSpacing: '1px',
            background: 'linear-gradient(90deg, #3b82f6 0%, #93c5fd 60%, #bfdbfe 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Gestión de la Memoria - SO
          </Typography>
          <Box sx={{ 
            px: 3, py: 1, 
            backgroundColor: 'background.default', 
            borderRadius: 2, 
            border: '1px solid', borderColor: 'divider',
            color: 'secondary.main', fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 'bold'
          }}>
            T = {tiempo}
          </Box>
        </Paper>

        {/* Fila Superior de Controles (Añadir Proceso, Ajustes, Reloj) alineados horizontalmente */}
        <Grid container spacing={3} sx={{ mb: 4, display: 'flex', justifyContent: 'center' }} alignItems="stretch">
          
          {/* Añadir Proceso */}
          <Grid item xs="auto">
            <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Añadir Nuevo Proceso</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                <TextField label="Llegada" type="number" InputProps={{ inputProps: { min: 0, step: 1 } }} size="small" value={form.llegada} onChange={e => setForm({...form, llegada: e.target.value})} sx={{ width: '110px' }} />
                <TextField label="Tamaño" type="number" InputProps={{ inputProps: { min: 1, step: 1 } }} size="small" value={form.tamano} onChange={e => setForm({...form, tamano: e.target.value})} sx={{ width: '110px' }} />
                <TextField label="Duración" type="number" InputProps={{ inputProps: { min: 1, step: 1 } }} size="small" value={form.duracion} onChange={e => setForm({...form, duracion: e.target.value})} sx={{ width: '110px' }} />
              </Box>
              <Button variant="contained" fullWidth startIcon={<Add />} onClick={agregarProceso} sx={{ py: 0.8, whiteSpace: 'nowrap', minWidth: 'max-content' }}>
                Agregar Proceso a la Cola
              </Button>
            </Paper>
          </Grid>

          {/* Configuración */}
          <Grid item xs="auto">
            <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Ajustes del Sistema</Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'nowrap', alignItems: 'center' }}>
                <TextField 
                  label="Capacidad (U)" 
                  type="number" 
                  size="small"
                  value={config.capacidad} 
                  onChange={e => setConfig({...config, capacidad: parseInt(e.target.value) || 100})} 
                  sx={{ flex: '1 1 30%', minWidth: '90px' }}
                />
                <FormControl size="small" sx={{ flex: '1 1 30%', minWidth: '90px' }}>
                  <InputLabel>Criterio</InputLabel>
                  <Select
                    value={config.criterio}
                    label="Criterio"
                    onChange={e => setConfig({...config, criterio: e.target.value})}
                  >
                    <MenuItem value="fifo">FIFO</MenuItem>
                    <MenuItem value="min">Menor Tamaño</MenuItem>
                    <MenuItem value="max">Mayor Tamaño</MenuItem>
                  </Select>
                </FormControl>
                <Box sx={{ flex: '1 1 30%', display: 'flex', justifyContent: 'center', minWidth: '90px' }}>
                  <FormControlLabel 
                    control={<Switch color="primary" size="small" checked={config.defrag} onChange={e => setConfig({...config, defrag: e.target.checked})} />} 
                    label={<Typography variant="caption" sx={{ fontWeight: 'bold' }}>Desfragmentar</Typography>}
                    labelPlacement="bottom"
                    sx={{ m: 0 }}
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Controles de Ejecución */}
          <Grid item xs="auto">
            <Paper elevation={2} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}>Controles de Reloj</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button variant="outlined" color="primary" fullWidth onClick={avanzarPaso} sx={{ minWidth: 0, px: 1, py: 0.5 }}>
                  <SkipNext fontSize="small" /> +1 Tick
                </Button>
                <Button variant="outlined" color="inherit" fullWidth onClick={reiniciar} sx={{ minWidth: 0, px: 1, py: 0.5 }}>
                  <RestartAlt fontSize="small" /> Reset
                </Button>
              </Box>
              <Button 
                variant="contained" 
                color={isPlaying ? "error" : "success"} 
                fullWidth 
                startIcon={isPlaying ? <Pause /> : <PlayArrow />} 
                onClick={() => setIsPlaying(!isPlaying)}
                sx={{ py: 0.8 }}
              >
                {isPlaying ? "Pausar" : "Iniciar"}
              </Button>
            </Paper>
          </Grid>
        </Grid>

        {/* Fila Principal: Tabla y Memoria RAM centradas */}
        <Grid container spacing={8} sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          {/* Tabla de Procesos */}
          <Grid item xs={12} md={7} lg={6} xl={5}>
            <Paper elevation={3} sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 450 }}>
              <Typography variant="h6" gutterBottom color="text.secondary" sx={{ fontWeight: 'bold' }}>Tabla de Procesos</Typography>
              <Divider sx={{ mb: 2 }} />
              <TableContainer sx={{ 
                flexGrow: 1, 
                overflowX: 'hidden', 
                overflowY: 'auto',
                '&::-webkit-scrollbar': { display: 'none' },
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
              }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>PID</TableCell>
                      <TableCell align="center">Llegada</TableCell>
                      <TableCell align="center">Tamaño</TableCell>
                      <TableCell align="center">Duración</TableCell>
                      <TableCell align="center">Salida</TableCell>
                      <TableCell align="center">Estado</TableCell>
                      <TableCell align="center">Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody component={motion.tbody}>
                    <AnimatePresence>
                      {procesos.map((p) => (
                        <TableRow 
                          key={p.id || p.pid}
                          component={motion.tr}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          sx={{ 
                            backgroundColor: p.estado === 'En RAM' ? 'rgba(51, 65, 85, 0.4)' : 'inherit',
                            '&:last-child td, &:last-child th': { border: 0 }
                          }}
                        >
                          <TableCell sx={{ fontWeight: 'bold', color: p.color, fontSize: '1.05rem' }}>{p.pid}</TableCell>
                          <TableCell align="center" sx={{ fontSize: '1rem' }}>{p.llegada}</TableCell>
                          <TableCell align="center" sx={{ fontSize: '1rem' }}>{p.tamano}</TableCell>
                          <TableCell align="center" sx={{ fontSize: '1rem' }}>{p.duracion}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>{p.salida !== null ? p.salida : '-'}</TableCell>
                          <TableCell align="center">{renderBadge(p.estado)}</TableCell>
                          <TableCell align="center">
                            {p.estado === 'Pendiente' && (
                              <Tooltip title="Eliminar">
                                <IconButton size="small" color="error" onClick={() => eliminarProceso(p.pid)}>
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Memoria RAM */}
          <Grid item xs={12} md={4} lg={3} xl={3}>
            <Paper elevation={3} sx={{ p: 4, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 450 }}>
              <Typography variant="h6" gutterBottom color="text.secondary" sx={{ fontWeight: 'bold' }}>Memoria RAM</Typography>
              <Divider sx={{ mb: 3, width: '100%' }} />
              
              <Box sx={{ 
                position: 'relative', 
                width: '100%', 
                maxWidth: 220,
                flexGrow: 1, 
                backgroundColor: 'background.default', 
                border: '2px solid', borderColor: 'divider', 
                borderRadius: 2, 
                overflow: 'hidden', 
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)'
              }}>
                <AnimatePresence>
                  {bloquesRAM.map((b) => (
                    <Box
                      key={b.id || b.pid}
                      component={motion.div}
                      layout
                      initial={{ opacity: 0, scale: 0.75 }}
                      animate={{ opacity: 1, scale: 1, top: `${(b.start / config.capacidad) * 100}%`, height: `${(b.size / config.capacidad) * 100}%` }}
                      exit={{ opacity: 0, scale: 0.75 }}
                      transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
                      sx={{
                        position: 'absolute',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        color: '#fff',
                        textShadow: '0px 1px 2px rgba(0,0,0,0.8)',
                        borderBottom: '1px solid rgba(0,0,0,0.3)',
                        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)',
                        backgroundColor: procesos.find(p => p.id === b.id)?.color || b.color
                      }}
                    >
                      {procesos.find(p => p.id === b.id)?.pid || b.pid}
                    </Box>
                  ))}
                </AnimatePresence>
              </Box>
              <Typography variant="subtitle1" sx={{ mt: 3, fontFamily: 'monospace', color: 'text.secondary', fontWeight: 'bold' }}>
                Ocupado: {bloquesRAM.reduce((acc, b) => acc + b.size, 0)} / {config.capacidad} U
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Línea de Tiempo */}
        <Paper elevation={3} sx={{ p: 3, mt: 4, overflowX: 'auto', overflowY: 'hidden', minHeight: 280 }}>
          <Typography variant="h6" gutterBottom color="text.secondary" sx={{ fontWeight: 'bold' }}>Línea de Tiempo</Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ position: 'relative', minWidth: 1000, height: 220, display: 'flex', alignItems: 'center', pt: 4 }}>
            <Box sx={{ position: 'absolute', width: '100%', height: '2px', backgroundColor: '#ffffff', top: '50%', transform: 'translateY(-50%)' }} />
            
            {Array.from({ length: Math.max(35, tiempo + 5) }).map((_, t) => (
              <Box key={t} sx={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center' }}>
                
                {/* Marca del tiempo actual */}
                {t === tiempo && (
                  <Box sx={{ 
                    position: 'absolute', width: 36, height: 110, 
                    backgroundColor: 'rgba(59, 130, 246, 0.15)', 
                    border: '2px solid rgba(59, 130, 246, 0.4)', 
                    borderRadius: 1, top: '50%', transform: 'translateY(-50%)', zIndex: 0 
                  }} />
                )}
                
                <Box sx={{ width: '2px', height: 20, backgroundColor: 'text.secondary', position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }} />
                <Typography variant="body2" sx={{ position: 'absolute', top: '50%', mt: 3, fontFamily: 'monospace', color: 'text.secondary', fontWeight: 'bold' }}>{t}</Typography>
                
                {/* Flechas (Agrupadas para evitar superposición) */}
                <Box sx={{ position: 'absolute', bottom: '50%', mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20 }}>
                  {procesos.filter(p => p.llegada === t).map(p => (
                    <Box key={p.pid} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: p.color, mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.9rem', lineHeight: 1 }}>{p.pid}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1 }}>↓</Typography>
                    </Box>
                  ))}
                </Box>
                
                <Box sx={{ position: 'absolute', top: '50%', mt: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20 }}>
                  {procesos.filter(p => p.salida === t).map(p => (
                    <Box key={p.pid} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: p.color, mt: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1 }}>↓</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.9rem', lineHeight: 1 }}>{p.pid}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>

      </Container>
    </Box>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AppContent />
    </ThemeProvider>
  );
}