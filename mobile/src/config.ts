import * as Device from 'expo-device'

// Em emulador Android o host da máquina é 10.0.2.2
// Em dispositivo físico use o IP da máquina na rede Wi-Fi
export const SERVER_URL = Device.isDevice
  ? 'http://192.168.1.211:3000'
  : 'http://10.0.2.2:3000'

export const API_URL = `${SERVER_URL}/api`
