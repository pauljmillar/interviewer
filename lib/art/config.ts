export interface ArtConfig {
  palette: Record<string, [number, number, number]>;
  bgOrder: string[];
  canvas: { width: number; height: number };
  still: {
    circleCount:     [number, number];
    circleSize:      [number, number];
    lineCount:       [number, number];
    lineWeight:      [number, number];
    arcCount:        [number, number];
    arcWeight:       [number, number];
    vignetteOpacity: number;
  };
  gif: {
    fps:             number;
    duration:        number;
    lineLength:      [number, number];
    lineWeight:      [number, number];
    lineAmplitude:   [number, number];
    circleRadius:    [number, number];
    circleAmplitude: [number, number];
    staticLineWeight:[number, number];
  };
}

export const DEFAULT_CONFIG: ArtConfig = {
  palette: {
    indigo: [11,  8, 53],
    ocean:  [12, 86,121],
    teal:   [63,138,140],
    red:    [229, 52, 11],
    amber:  [242,138, 15],
    cream:  [255,231,189],
  },
  bgOrder: ['indigo','ocean','teal','red','amber','cream'],
  canvas: { width: 800, height: 800 },
  still: {
    circleCount:     [4, 7],
    circleSize:      [0.22, 0.65],
    lineCount:       [3, 6],
    lineWeight:      [14, 40],
    arcCount:        [1, 3],
    arcWeight:       [10, 28],
    vignetteOpacity: 0.55,
  },
  gif: {
    fps:             10,
    duration:        14,
    lineLength:      [0.30, 0.55],
    lineWeight:      [16, 34],
    lineAmplitude:   [0.14, 0.26],
    circleRadius:    [0.14, 0.30],
    circleAmplitude: [0.12, 0.22],
    staticLineWeight:[18, 40],
  },
};
