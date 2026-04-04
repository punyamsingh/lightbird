export class FFmpeg {
  load = jest.fn().mockResolvedValue(undefined);
  on = jest.fn();
  off = jest.fn();
}
