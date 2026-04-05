export interface LightBirdConfig {
  ffmpegCDN?: string
}

let config: LightBirdConfig = {}

export function configureLightBird(options: LightBirdConfig): void {
  config = { ...config, ...options }
}

export function getConfig(): LightBirdConfig {
  return config
}
