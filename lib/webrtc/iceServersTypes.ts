/** Minimales RTCIceServer-Shape (ohne DOM-lib in reinen Modulen). */
export type RTCIceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};
