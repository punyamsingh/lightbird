import { ProgressEstimator } from '@/lib/progress-estimator';

describe('ProgressEstimator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns zero speed before 500ms have elapsed after first update', () => {
    const est = new ProgressEstimator(100 * 1024 * 1024); // 100 MB
    est.update(0.3); // startTime is set here
    jest.advanceTimersByTime(200); // only 200ms since first update
    expect(est.getEstimate().speedMBps).toBe(0);
  });

  it('returns zero speed before any update', () => {
    const est = new ProgressEstimator(100 * 1024 * 1024);
    jest.advanceTimersByTime(5000); // lots of time passes but no update
    expect(est.getEstimate().speedMBps).toBe(0);
  });

  it('calculates speed correctly after 1 second from first update', () => {
    const est = new ProgressEstimator(100 * 1024 * 1024); // 100 MB
    est.update(0.1); // startTime set here
    jest.advanceTimersByTime(1000); // 1s has elapsed since first update
    est.update(0.1); // same progress value, just to re-read estimate
    const { speedMBps } = est.getEstimate();
    expect(speedMBps).toBeCloseTo(10, 0);
  });

  it('returns null ETA when progress is 0', () => {
    const est = new ProgressEstimator(100 * 1024 * 1024);
    jest.advanceTimersByTime(2000);
    est.update(0);
    expect(est.getEstimate().etaSeconds).toBeNull();
  });

  it('ignores NaN progress values', () => {
    const est = new ProgressEstimator(100 * 1024 * 1024);
    est.update(NaN);
    jest.advanceTimersByTime(2000);
    expect(est.getEstimate().speedMBps).toBe(0);
    expect(est.getEstimate().etaSeconds).toBeNull();
  });

  it('clamps progress values above 1 to 1', () => {
    const est = new ProgressEstimator(100 * 1024 * 1024);
    est.update(1.5); // should be clamped to 1.0
    jest.advanceTimersByTime(1000);
    const { speedMBps, etaSeconds } = est.getEstimate();
    expect(speedMBps).toBeGreaterThan(0);
    expect(etaSeconds).toBe(0); // 0 bytes remaining at progress = 1
  });

  it('clamps negative progress values to 0', () => {
    const est = new ProgressEstimator(100 * 1024 * 1024);
    est.update(-0.5); // should be clamped to 0
    jest.advanceTimersByTime(2000);
    expect(est.getEstimate().speedMBps).toBe(0);
    expect(est.getEstimate().etaSeconds).toBeNull();
  });

  it('returns decreasing ETA as progress increases', () => {
    const est = new ProgressEstimator(100 * 1024 * 1024);
    est.update(0.1); // startTime set here at T=0
    jest.advanceTimersByTime(1000); // 1s has elapsed since first update
    const eta1 = est.getEstimate().etaSeconds!;

    jest.advanceTimersByTime(1000); // 2s total since first update
    est.update(0.2);
    const eta2 = est.getEstimate().etaSeconds!;

    expect(eta2).toBeLessThan(eta1);
  });
});
