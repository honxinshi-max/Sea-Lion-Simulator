import Phaser from 'phaser';

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  options: { width?: number; height?: number; accent?: boolean; small?: boolean } = {},
): Phaser.GameObjects.Container {
  const width = options.width ?? 250;
  const height = options.height ?? (options.small ? 44 : 56);
  const container = scene.add.container(x, y).setSize(width, height);
  const bg = scene.add.rectangle(0, 0, width, height, options.accent ? 0xe7a84c : 0x173f50, 0.96)
    .setStrokeStyle(2, options.accent ? 0xffe3a5 : 0x6da9b0, 0.85);
  const text = scene.add.text(0, 0, label, {
    color: options.accent ? '#172e35' : '#eef9f7',
    fontFamily: 'system-ui, sans-serif',
    fontSize: options.small ? '18px' : '22px',
    fontStyle: '600',
  }).setOrigin(0.5);
  container.add([bg, text]);
  container.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
  container.on('pointerover', () => bg.setFillStyle(options.accent ? 0xf3bd66 : 0x235b6d, 1));
  container.on('pointerout', () => bg.setFillStyle(options.accent ? 0xe7a84c : 0x173f50, 0.96));
  container.on('pointerdown', () => {
    container.setScale(0.97);
    onClick();
  });
  container.on('pointerup', () => container.setScale(1));
  return container;
}

export function panelBackground(scene: Phaser.Scene, width: number, height: number): Phaser.GameObjects.Rectangle {
  return scene.add.rectangle(0, 0, width, height, 0x082a38, 0.94).setStrokeStyle(2, 0x77b5b6, 0.7);
}
