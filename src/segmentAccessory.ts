import { PlatformAccessory, Service } from 'homebridge';
import { WLEDPlatform } from './platform';
import { WLEDDevice, WLEDState } from './wledDevice';

/** A single WLED segment exposed as an independent HomeKit light. */
export class WLEDSegmentAccessory {
  private readonly lightService: Service;
  private stateListener = (state: WLEDState) => this.updateState(state);

  constructor(
    private readonly platform: WLEDPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly wledDevice: WLEDDevice,
    private readonly segmentId: number,
  ) {
    const name = accessory.context.segmentName || `Segment ${segmentId}`;
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'WLED')
      .setCharacteristic(this.platform.Characteristic.Model, 'WLED Segment')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, `${accessory.context.device.host}-segment-${segmentId}`);

    this.lightService = this.accessory.getService(this.platform.Service.Lightbulb) ||
      this.accessory.addService(this.platform.Service.Lightbulb);
    this.lightService
      .setCharacteristic(this.platform.Characteristic.Name, name)
      .setCharacteristic(this.platform.Characteristic.ConfiguredName, name);

    this.lightService.getCharacteristic(this.platform.Characteristic.On)
      .onGet(() => this.state().on)
      .onSet(value => this.wledDevice.setSegmentPower(this.segmentId, value as boolean));
    this.lightService.getCharacteristic(this.platform.Characteristic.Brightness)
      .onGet(() => this.state().brightness)
      .onSet(value => this.wledDevice.setSegmentBrightness(this.segmentId, value as number));
    this.lightService.getCharacteristic(this.platform.Characteristic.Hue)
      .onGet(() => this.state().hue)
      .onSet(value => this.wledDevice.setSegmentHSV(this.segmentId, value as number, this.state().saturation, this.state().brightness));
    this.lightService.getCharacteristic(this.platform.Characteristic.Saturation)
      .onGet(() => this.state().saturation)
      .onSet(value => this.wledDevice.setSegmentHSV(this.segmentId, this.state().hue, value as number, this.state().brightness));

    this.wledDevice.addStateListener(this.stateListener);
    this.updateState(this.wledDevice.getState());
  }

  private state(): WLEDState {
    return this.wledDevice.getSegmentState(this.segmentId) || {
      on: false, brightness: 0, hue: 0, saturation: 0, colorMode: 'rgb',
      color: { r: 0, g: 0, b: 0 }, colorTemperature: 140, effect: 0, presetId: 0,
    };
  }

  private updateState(state: WLEDState): void {
    const segment = state.segmentState?.[this.segmentId];
    if (!segment) return;
    this.lightService.updateCharacteristic(this.platform.Characteristic.On, segment.on);
    this.lightService.updateCharacteristic(this.platform.Characteristic.Brightness, segment.brightness);
    this.lightService.updateCharacteristic(this.platform.Characteristic.Hue, segment.hue);
    this.lightService.updateCharacteristic(this.platform.Characteristic.Saturation, segment.saturation);
  }
}
