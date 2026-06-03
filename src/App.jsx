import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayArrow, Pause, SkipNext, RestartAlt, Add, Delete } from '@mui/icons-material';
import { 
  ThemeProvider, createTheme, CssBaseline, 
  Box, Container, Grid, Paper, Typography, 
  TextField, Select, MenuItem, Switch, 
  FormControlLabel, Button, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, FormControl, InputLabel
} from '@mui/material';

const COLORES = [
  '#3b82f6','#a78bfa','#34d399','#f59e0b','#f87171',
  '#38bdf8','#fb7185','#818cf8','#22d3ee','#facc15',
  '#4ade80','#e879f9','#fb923c','#2dd4bf','#c084fc',
  '#f472b6','#a3e635','#67e8f9','#fca5a1','#d946ef'
];

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary:   { main: '#3B82F6', dark: '#2563EB', light: '#60A5FA' },
    secondary: { main: '#60A5FA' },
    error:     { main: '#EF4444' },
    success:   { main: '#10B981' },
    warning:   { main: '#F59E0B' },
    background: { default: '#0F172A', paper: 'transparent' }, 
    divider: 'rgba(255, 255, 255, 0.08)',
    text: { primary: '#E2E8F0', secondary: '#94A3B8' }
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
          backgroundColor: 'rgba(148, 163, 184, 0.12) !important', 
          backdropFilter: 'blur(16px) !important',
          WebkitBackdropFilter: 'blur(16px) !important',
          border: '1px solid rgba(255, 255, 255, 0.15) !important',
          backgroundImage: 'none !important',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3) !important',
          borderRadius: '12px !important'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
        containedPrimary: {
          backgroundColor: '#E2E8F0',
          color: '#0F172A',
          '&:hover': { backgroundColor: '#CBD5E1' },
        },
        outlinedInherit: {
          borderColor: '#475569',
          color: '#CBD5E1',
          '&:hover': { borderColor: '#64748B', backgroundColor: 'rgba(71,85,105,0.15)' }
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(148, 163, 184, 0.2)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(148, 163, 184, 0.4)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#3B82F6',
          },
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: 'rgba(255, 255, 255, 0.05)' },
        head: {
          fontWeight: 600,
          color: '#94A3B8',
          textTransform: 'uppercase',
          fontSize: '0.72rem',
          letterSpacing: '0.08em',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }
      }
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0F172A',
          backgroundImage: `
            radial-gradient(circle at 15% 50%, rgba(59, 130, 246, 0.12), transparent 25%),
            radial-gradient(circle at 85% 30%, rgba(167, 139, 250, 0.1), transparent 25%)
          `,
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
        },
        'input[type=number]': { MozAppearance: 'textfield' },
        'input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
        'input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: 'rgba(255, 255, 255, 0.08)' }
      }
    }
  }
});

function AppContent() {
  const glassPaperSx = {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1.5px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
    borderRadius: '16px',
    backgroundImage: 'none'
  };

  const [procesos, setProcesos] = useState([]);
  const [bloquesRAM, setBloquesRAM] = useState([]);
  const [tiempo, setTiempo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [historialDefrag, setHistorialDefrag] = useState([]);
  
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
      return { exito: true, nuevaRam: ramDefrag, defragEvent: true };
    }

    return { exito: false, nuevaRam: ramActual };
  }, [config]);

  const avanzarPaso = useCallback(() => {
    let nuevosProcesos = [...procesos];
    let nuevaRam = [...bloquesRAM];
    let huboDefrag = false;

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
          if (resultado.defragEvent) huboDefrag = true;
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

    if (huboDefrag) {
      setHistorialDefrag(prev => {
        if (!prev.includes(tiempo)) return [...prev, tiempo];
        return prev;
      });
    }

    setBloquesRAM(nuevaRam);
    setProcesos(nuevosProcesos);
    setTiempo(prev => prev + 1);
  }, [procesos, bloquesRAM, tiempo, config, intentarAsignar]);

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
    setHistorialDefrag([]);
  };

  const renderBadge = (estado) => {
    let bgColor = '#1E293B';
    let color = '#94A3B8';
    
    if (estado === 'En Cola')   { bgColor = 'rgba(245,158,11,0.15)';  color = '#FBBF24'; }
    if (estado === 'En RAM')    { bgColor = 'rgba(16,185,129,0.15)';  color = '#34D399'; }
    if (estado === 'Terminado') { bgColor = 'rgba(59,130,246,0.15)';  color = '#60A5FA'; }
    
    return (
      <Box sx={{ 
        px: 1, py: 0.5, borderRadius: 5, display: 'inline-block',
        backgroundColor: bgColor, color: color, fontSize: '0.75rem', fontWeight: 'bold',
        minWidth: '85px', textAlign: 'center', border: `1px solid ${color}40`
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
      position: 'relative',
      overflow: 'hidden',
    }}>
      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
        
        {/* Header Principal */}
        <Paper sx={{ ...glassPaperSx, p: 3, mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" component="h1" sx={{
            fontFamily: '"Outfit", sans-serif',
            letterSpacing: '1px',
            color: '#ffffff',
            fontWeight: 800
          }}>
            Gestión de la Memoria - SO
          </Typography>
          <Box sx={{ 
            px: 3, py: 1, 
            backgroundColor: 'rgba(15, 23, 42, 0.6)', 
            borderRadius: 2, 
            border: '1px solid rgba(148, 163, 184, 0.2)',
            color: '#60A5FA', fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 'bold'
          }}>
            T = {tiempo}
          </Box>
        </Paper>

        {/* Fila Superior de Controles */}
        <Grid container spacing={3} sx={{ mb: 4, display: 'flex', justifyContent: 'center' }} alignItems="stretch">
          
          {/* Añadir Proceso */}
          <Grid item xs="auto">
            <Paper sx={{ ...glassPaperSx, p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold' }}>Añadir Nuevo Proceso</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <TextField label="Llegada" type="number" InputProps={{ inputProps: { min: 0, step: 1 } }} size="small" value={form.llegada} onChange={e => setForm({...form, llegada: e.target.value})} sx={{ width: '110px' }} />
                <TextField label="Tamaño" type="number" InputProps={{ inputProps: { min: 1, step: 1 } }} size="small" value={form.tamano} onChange={e => setForm({...form, tamano: e.target.value})} sx={{ width: '110px' }} />
                <TextField label="Duración" type="number" InputProps={{ inputProps: { min: 1, step: 1 } }} size="small" value={form.duracion} onChange={e => setForm({...form, duracion: e.target.value})} sx={{ width: '110px' }} />
              </Box>
              <Button variant="contained" fullWidth startIcon={<Add />} onClick={agregarProceso} sx={{ py: 1, backgroundColor: '#E2E8F0', color: '#0F172A', fontWeight: 'bold', '&:hover': { backgroundColor: '#CBD5E1' } }}>
                Agregar Proceso a la Cola
              </Button>
            </Paper>
          </Grid>

          {/* Configuración */}
          <Grid item xs="auto">
            <Paper sx={{ ...glassPaperSx, p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold' }}>Ajustes del Sistema</Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'nowrap', alignItems: 'center' }}>
                <TextField 
                  label="Capacidad (U)" 
                  type="number" 
                  size="small"
                  value={config.capacidad} 
                  onChange={e => setConfig({...config, capacidad: parseInt(e.target.value) || 100})} 
                  sx={{ minWidth: '100px' }}
                />
                <FormControl size="small" sx={{ minWidth: '130px' }}>
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
                <Box sx={{ display: 'flex', justifyContent: 'center', ml: 1 }}>
                  <FormControlLabel 
                    control={<Switch color="primary" size="small" checked={config.defrag} onChange={e => setConfig({...config, defrag: e.target.checked})} />} 
                    label={<Typography variant="caption" sx={{ fontWeight: 'bold', color: '#94A3B8' }}>Desfragmentar</Typography>}
                    labelPlacement="bottom"
                    sx={{ m: 0 }}
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Controles de Ejecución */}
          <Grid item xs="auto">
            <Paper sx={{ ...glassPaperSx, p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold' }}>Controles de Reloj</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button variant="outlined" color="primary" fullWidth onClick={avanzarPaso} sx={{ minWidth: '90px', py: 0.5 }}>
                  <SkipNext fontSize="small" sx={{ mr: 0.5 }} /> +1 Tick
                </Button>
                <Button variant="outlined" color="inherit" fullWidth onClick={reiniciar} sx={{ minWidth: '90px', py: 0.5 }}>
                  <RestartAlt fontSize="small" sx={{ mr: 0.5 }} /> Reset
                </Button>
              </Box>
              <Button 
                variant="contained" 
                color={isPlaying ? "error" : "success"} 
                fullWidth 
                startIcon={isPlaying ? <Pause /> : <PlayArrow />} 
                onClick={() => setIsPlaying(!isPlaying)}
                sx={{ py: 1, backgroundColor: isPlaying ? '#EF4444' : '#10B981', color: '#fff', '&:hover': { backgroundColor: isPlaying ? '#DC2626' : '#059669' } }}
              >
                {isPlaying ? "Pausar" : "Iniciar"}
              </Button>
            </Paper>
          </Grid>
        </Grid>

        {/* Fila Principal: Tabla y Memoria RAM */}
        <Grid container spacing={4} sx={{ display: 'flex', justifyContent: 'center' }}>
          {/* Tabla de Procesos */}
          <Grid item xs={12} md={7} lg={6}>
            <Paper sx={{ ...glassPaperSx, p: 3, height: '100%', display: 'flex', flexDirection: 'column', minHeight: 400 }}>
              <Typography variant="h6" gutterBottom color="text.primary" sx={{ fontWeight: 'bold', mb: 2 }}>Tabla de Procesos</Typography>
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
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          sx={{ 
                            borderLeft: `3px solid ${p.color}`,
                            backgroundColor: p.estado === 'En RAM'
                              ? `${p.color}18`
                              : 'transparent',
                            '&:hover': { backgroundColor: 'rgba(255,255,255,0.02)' },
                            '&:last-child td, &:last-child th': { border: 0 },
                            transition: 'background-color 0.3s ease',
                          }}
                        >
                          <TableCell sx={{ fontWeight: 'bold', color: p.color }}>{p.pid}</TableCell>
                          <TableCell align="center">{p.llegada}</TableCell>
                          <TableCell align="center">{p.tamano}</TableCell>
                          <TableCell align="center">{p.duracion}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>{p.salida !== null ? p.salida : '-'}</TableCell>
                          <TableCell align="center">{renderBadge(p.estado)}</TableCell>
                          <TableCell align="center">
                            {p.estado === 'Pendiente' && (
                              <Tooltip title="Eliminar">
                                <IconButton size="small" sx={{ color: '#EF4444' }} onClick={() => eliminarProceso(p.pid)}>
                                  <Delete fontSize="small" />
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
          <Grid item xs={12} md={4} lg={3}>
            <Paper sx={{ ...glassPaperSx, p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 400 }}>
              <Typography variant="h6" gutterBottom color="text.primary" sx={{ fontWeight: 'bold', mb: 3 }}>Memoria RAM</Typography>
              
              <Box sx={{ 
                position: 'relative', 
                width: '100%', 
                maxWidth: 180,
                flexGrow: 1, 
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(148, 163, 184, 0.2)', 
                borderRadius: 2, 
                overflow: 'hidden', 
                boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.6)'
              }}>
                <AnimatePresence>
                  {bloquesRAM.map((b) => (
                    <Box
                      key={b.id || b.pid}
                      component={motion.div}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1, top: `${(b.start / config.capacidad) * 100}%`, height: `${(b.size / config.capacidad) * 100}%` }}
                      exit={{ opacity: 0, scale: 0.95 }}
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
                        borderTop: '1px solid rgba(255,255,255,0.2)',
                        backgroundColor: procesos.find(p => p.id === b.id)?.color || b.color
                      }}
                    >
                      {procesos.find(p => p.id === b.id)?.pid || b.pid}
                    </Box>
                  ))}
                </AnimatePresence>
              </Box>
              <Typography variant="subtitle2" sx={{ mt: 3, fontFamily: 'monospace', color: '#94A3B8', fontWeight: 'bold' }}>
                Ocupado: <span style={{ color: '#E2E8F0' }}>{bloquesRAM.reduce((acc, b) => acc + b.size, 0)}</span> / {config.capacidad} U
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Línea de Tiempo */}
        <Paper sx={{ ...glassPaperSx, p: 3, mt: 4, overflowX: 'auto', overflowY: 'hidden', minHeight: 220 }}>
          <Typography variant="h6" gutterBottom color="text.primary" sx={{ fontWeight: 'bold' }}>Línea de Tiempo</Typography>
          <Box sx={{ position: 'relative', minWidth: 1000, height: 140, display: 'flex', alignItems: 'center', pt: 2 }}>
            <Box sx={{ position: 'absolute', width: '100%', height: '1px', backgroundColor: 'rgba(148, 163, 184, 0.4)', top: '50%', transform: 'translateY(-50%)' }} />
            
            {Array.from({ length: Math.max(35, tiempo + 5) }).map((_, t) => (
              <Box key={t} sx={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center' }}>
                
                {/* Marca del tiempo actual */}
                {t === tiempo && (
                  <Box sx={{ 
                    position: 'absolute', width: 32, height: 80, 
                    backgroundColor: 'rgba(59, 130, 246, 0.15)', 
                    border: '1px solid rgba(59, 130, 246, 0.5)', 
                    borderRadius: 1, top: '50%', transform: 'translateY(-50%)', zIndex: 0 
                  }} />
                )}

                {/* Marcador de Desfragmentación */}
                {historialDefrag.includes(t) && (
                  <Box sx={{ 
                    position: 'absolute', 
                    top: '50%', transform: 'translateY(-50%)', zIndex: 15,
                    display: 'flex', flexDirection: 'column', alignItems: 'center'
                  }}>
                    <svg width="12" height="30" viewBox="0 0 12 30">
                      <path d="M6,0 L12,6 L0,12 L12,18 L0,24 L6,30" 
                        fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                    </svg>
                  </Box>
                )}
                
                <Box sx={{ width: '1px', height: 16, backgroundColor: '#94A3B8', position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }} />
                <Typography variant="caption" sx={{ position: 'absolute', top: '50%', mt: 2.5, fontFamily: 'monospace', color: '#94A3B8' }}>{t}</Typography>
                
                {/* Flechas de Llegada */}
                <Box sx={{ position: 'absolute', bottom: '50%', mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20 }}>
                  {procesos.filter(p => p.llegada === t).map(p => (
                    <Box key={`arr-${p.pid}`} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: p.color, mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', lineHeight: 1 }}>{p.pid}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', lineHeight: 1 }}>↓</Typography>
                    </Box>
                  ))}
                </Box>
                
                {/* Flechas de Salida */}
                <Box sx={{ position: 'absolute', top: '50%', mt: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20 }}>
                  {procesos.filter(p => p.salida === t).map(p => (
                    <Box key={`dep-${p.pid}`} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: p.color, mt: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', lineHeight: 1 }}>↓</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', lineHeight: 1 }}>{p.pid}</Typography>
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