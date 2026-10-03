import { ThreeJSComponent } from './threejs-view.component';

/**
 * jsdom has no WebGL, so the renderer itself (created lazily in loadRenderer())
 * is not exercised here; the scene setup and the coordinate conversion are.
 */
describe('ThreeJSComponent', () => {
  it('can be created without a WebGL context', () => {
    expect(() => new ThreeJSComponent()).not.toThrow();
  });

  const component = new ThreeJSComponent();
  const convert = (longitude: number, latitude: number) => component.convertCoordinates(longitude, latitude);

  it('maps the scene origin coordinates to (0, 0, 0)', () => {
    const { x, y, z } = convert(13.327974301530459, 52.513091975725075);
    expect(x).toBeCloseTo(0);
    expect(y).toBe(0);
    expect(z).toBeCloseTo(0);
  });

  it('maps east to +x and north to -z', () => {
    const east = convert(13.33, 52.513091975725075);
    const north = convert(13.327974301530459, 52.52);
    expect(east.x).toBeGreaterThan(0);
    expect(north.z).toBeLessThan(0);
  });

  it('scales the width of the city mesh (in degrees) to 214 scene units', () => {
    const a = convert(13.32631827581811, 52.5);
    const b = convert(13.329418317727734, 52.5);
    expect(b.x - a.x).toBeCloseTo(214);
  });
});
