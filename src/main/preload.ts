import { contextBridge, ipcRenderer } from 'electron';

/**
 * Expõe um objeto `window.api` seguro para o processo renderer.
 * O contextIsolation garante que o renderer não acesse APIs do Node diretamente.
 */
contextBridge.exposeInMainWorld('api', {
  consultarPlaca:      (placa: string)  => ipcRenderer.invoke('consultar-placa', placa),
  registrarEntrada:    (dados: unknown) => ipcRenderer.invoke('registrar-entrada', dados),
  registrarSaida:      (placa: string)  => ipcRenderer.invoke('registrar-saida', placa),
  listarVeiculosNoPatio: ()             => ipcRenderer.invoke('listar-veiculos-patio'),
  buscarHistorico:     (filtros: unknown) => ipcRenderer.invoke('buscar-historico', filtros),
  getDashboard:        ()               => ipcRenderer.invoke('get-dashboard'),
});
