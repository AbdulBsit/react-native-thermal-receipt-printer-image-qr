import { NativeModules, NativeEventEmitter, Platform } from "react-native";

import * as EPToolkit from "./utils/EPToolkit";
import { processColumnText } from './utils/print-column';
import { COMMANDS } from './utils/printer-commands';
import { connectToHost } from './utils/net-connect';

const RNUSBPrinter = NativeModules.RNUSBPrinter;
const RNBLEPrinter = NativeModules.RNBLEPrinter;
const RNNetPrinter = NativeModules.RNNetPrinter;

export interface PrinterOptions {
  beep?: boolean;
  cut?: boolean;
  tailingLine?: boolean;
  encoding?: string;
}

export enum PrinterWidth {
  '58mm' = 58,
  '80mm' = 80
}

export interface PrinterImageOptions {
  beep?: boolean;
  cut?: boolean;
  tailingLine?: boolean;
  encoding?: string;
  imageWidth?: number,
  imageHeight?: number,
  printerWidthType?: PrinterWidth,
  // only ios
  paddingX?: number,
}

export interface IUSBPrinter {
  device_name: string;
  vendor_id: string;
  product_id: string;
}

export interface IBLEPrinter {
  device_name: string;
  inner_mac_address: string;
}

export interface INetPrinter {
  host: string;
  port: number;
}

export enum ColumnAliment {
  LEFT,
  CENTER,
  RIGHT,
}

const textTo64Buffer = (text: string, opts: PrinterOptions) => {
  const defaultOptions = {
    beep: false,
    cut: false,
    tailingLine: false,
    encoding: "UTF8",
  };

  const options = {
    ...defaultOptions,
    ...opts,
  };

  const fixAndroid = '\n'
  const buffer = EPToolkit.exchange_text(text + fixAndroid, options);
  return buffer.toString("base64");
};

const billTo64Buffer = (text: string, opts: PrinterOptions) => {
  const defaultOptions = {
    beep: true,
    cut: true,
    encoding: "UTF8",
    tailingLine: true,
  };
  const options = {
    ...defaultOptions,
    ...opts,
  };
  const buffer = EPToolkit.exchange_text(text, options);
  return buffer.toString("base64");
};

const textPreprocessingIOS = (text: string, canCut = true, beep = true) => {
  let options = {
    beep: beep,
    cut: canCut,
  };
  return {
    text: text
      .replace(/<\/?CB>/g, "")
      .replace(/<\/?CM>/g, "")
      .replace(/<\/?CD>/g, "")
      .replace(/<\/?C>/g, "")
      .replace(/<\/?D>/g, "")
      .replace(/<\/?B>/g, "")
      .replace(/<\/?M>/g, ""),
    opts: options,
  };
};

// const imageToBuffer = async (imagePath: string, threshold: number = 60) => {
//   const buffer = await EPToolkit.exchange_image(imagePath, threshold);
//   return buffer.toString("base64");
// };

const USBPrinter = {
  init: (): Promise<void> =>
    new Promise((resolve, reject) =>
      RNUSBPrinter.init(
        () => resolve(),
        (error: Error) => reject(error)
      )
    ),

  getDeviceList: (): Promise<IUSBPrinter[]> =>
    new Promise((resolve, reject) =>
      RNUSBPrinter.getDeviceList(
        (printers: IUSBPrinter[]) => resolve(printers),
        (error: Error) => reject(error)
      )
    ),

  connectPrinter: (vendorId: string, productId: string): Promise<IUSBPrinter> =>
    new Promise((resolve, reject) =>
      RNUSBPrinter.connectPrinter(
        vendorId,
        productId,
        (printer: IUSBPrinter) => resolve(printer),
        (error: Error) => reject(error)
      )
    ),

  closeConn: (): Promise<void> =>
    new Promise((resolve) => {
      RNUSBPrinter.closeConn();
      resolve();
    }),

  printText: (text: string, opts: PrinterOptions = {}): Promise<void> => {
    return new Promise((resolve, reject) => {
      RNUSBPrinter.printRawData(textTo64Buffer(text, opts), resolve, (error: Error) =>
        reject(error)
      )
    })
  }
  ,

  printBill: (text: string, opts: PrinterOptions = {}): Promise<void> => {
    return new Promise((resolve, reject) => {
      RNUSBPrinter.printRawData(billTo64Buffer(text, opts), resolve, (error: Error) =>
        reject(error)
      )

    })
  },
  /**
   * image url
   * @param imgUrl
   * @param opts
   */
  printImage: (imgUrl: string, opts: PrinterImageOptions = {}): Promise<void> => {
    if (Platform.OS === "ios") {
      return new Promise((resolve, reject) => {
        RNUSBPrinter.printImageData(imgUrl, opts, resolve, (error: Error) => reject(error));

      })
    } else {
      return new Promise((resolve, reject) => {
        RNUSBPrinter.printImageData(imgUrl, opts?.imageWidth ?? 0, opts?.imageHeight ?? 0, opts?.tailingLine ?? true, resolve, (error: Error) => reject(error));
      })
    }
  },
  /**
   * base 64 string
   * @param Base64
   * @param opts
   */
  printImageBase64: (Base64: string, opts: PrinterImageOptions = {}): Promise<void> => {
    if (Platform.OS === "ios") {
      return new Promise((resolve, reject) => {
        RNUSBPrinter.printImageBase64(Base64, opts, resolve, (error: Error) => reject(error));

      })
    } else {
      return new Promise((resolve, reject) => {
        RNUSBPrinter.printImageBase64(Base64, opts?.imageWidth ?? 0, opts?.imageHeight ?? 0, opts?.tailingLine ?? true, resolve, (error: Error) => reject(error));

      })
    }
  },
  /**
   * android print with encoder
   * @param text
   */
  printRaw: (text: string): Promise<void> => {
    if (Platform.OS === "ios") {
      return Promise.resolve()
    } else {
      return new Promise((resolve, reject) => {
        RNUSBPrinter.printRawData(text, resolve, (error: Error) =>
          reject(error)
        );
      })
    }
  },
  /**
   * `columnWidth`
   * 80mm => 46 character
   * 58mm => 30 character
   */
  printColumnsText: (texts: string[], columnWidth: number[], columnAliment: (ColumnAliment)[],
    columnStyle: string[], opts: PrinterOptions = {}): Promise<void> => {
    return new Promise((resolve, reject) => {
      const result = processColumnText(texts, columnWidth, columnAliment, columnStyle)
      RNUSBPrinter.printRawData(textTo64Buffer(result, opts), resolve, (error: Error) =>
        reject(error)
      );

    })
  },
};

const BLEPrinter = {
  init: (): Promise<void> =>
    new Promise((resolve, reject) =>
      RNBLEPrinter.init(
        () => resolve(),
        (error: Error) => reject(error)
      )
    ),

  getDeviceList: (): Promise<IBLEPrinter[]> =>
    new Promise((resolve, reject) =>
      RNBLEPrinter.getDeviceList(
        (printers: IBLEPrinter[]) => resolve(printers),
        (error: Error) => reject(error)
      )
    ),

  connectPrinter: (inner_mac_address: string): Promise<IBLEPrinter> =>
    new Promise((resolve, reject) =>
      RNBLEPrinter.connectPrinter(
        inner_mac_address,
        (printer: IBLEPrinter) => resolve(printer),
        (error: Error) => reject(error)
      )
    ),

  closeConn: (): Promise<void> =>
    new Promise((resolve) => {
      RNBLEPrinter.closeConn();
      resolve();
    }),

  printText: (text: string, opts: PrinterOptions = {}): Promise<void> => {
    if (Platform.OS === "ios") {
      return new Promise((resolve, reject) => {
        const processedText = textPreprocessingIOS(text, false, false);
        RNBLEPrinter.printRawData(
          processedText.text,
          processedText.opts,
          resolve,
          (error: Error) => reject(error)
        );
      })
    } else {
      return new Promise((resolve, reject) => {
        RNBLEPrinter.printRawData(textTo64Buffer(text, opts), resolve, (error: Error) =>
          reject(error)
        );
      })
    }
  },

  printBill: (text: string, opts: PrinterOptions = {}): Promise<void> => {
    if (Platform.OS === "ios") {
      return new Promise((resolve, reject) => {
        const processedText = textPreprocessingIOS(text, opts?.cut ?? true, opts.beep ?? true);
        RNBLEPrinter.printRawData(
          processedText.text,
          processedText.opts,
          resolve,
          (error: Error) => reject(error)
        );
      })
    } else {
      return new Promise((resolve, reject) => {
        RNBLEPrinter.printRawData(billTo64Buffer(text, opts), resolve, (error: Error) =>
          reject(error)
        );
      })
    }
  },
  /**
   * image url
   * @param imgUrl
   * @param opts
   */
  printImage: (imgUrl: string, opts: PrinterImageOptions = {}): Promise<void> => {
    if (Platform.OS === "ios") {
      /**
       * just development
       */
      return new Promise((resolve, reject) => {
        RNBLEPrinter.printImageData(imgUrl, opts, resolve, (error: Error) => reject(error));
      })
    } else {
      return new Promise((resolve, reject) => {
        RNBLEPrinter.printImageData(imgUrl, opts?.imageWidth ?? 0, opts?.imageHeight ?? 0,
          opts?.tailingLine ?? true, resolve, (error: Error) => reject(error));
      })
    }
  },
  /**
   * base 64 string
   * @param Base64
   * @param opts
   */
  printImageBase64: (Base64: string, opts: PrinterImageOptions = {}): Promise<void> => {
    if (Platform.OS === "ios") {
      /**
    * just development
    */
      return new Promise((resolve, reject) => {
        RNBLEPrinter.printImageBase64(Base64, opts, resolve, (error: Error) => reject(error));
      })
    } else {
      /**
    * just development
    */
      return new Promise((resolve, reject) => {
        RNBLEPrinter.printImageBase64(Base64, opts?.imageWidth ?? 0, opts?.imageHeight ?? 0, opts?.tailingLine ?? true, resolve, (error: Error) => reject(error));
      })
    }
  },
  /**
   * android print with encoder
   * @param text
   */
  printRaw: (text: string): Promise<void> => {
    if (Platform.OS === "ios") {
      return Promise.resolve()
    } else {
      return new Promise((resolve, reject) => {
        RNBLEPrinter.printRawData(text, resolve, (error: Error) =>
          reject(error)
        )
      })
    }
  },
  /**
   * `columnWidth`
   * 80mm => 46 character
   * 58mm => 30 character
   */
  printColumnsText: (texts: string[], columnWidth: number[], columnAliment: (ColumnAliment)[], columnStyle: string[], opts: PrinterOptions = {}): Promise<void> => {
    const result = processColumnText(texts, columnWidth, columnAliment, columnStyle)
    if (Platform.OS === "ios") {
      return new Promise((resolve, reject) => {
        const processedText = textPreprocessingIOS(result, false, false);
        RNBLEPrinter.printRawData(
          processedText.text,
          processedText.opts,
          resolve,
          (error: Error) => reject(error)
        );
      })
    } else {
      return new Promise((resolve, reject) => {
        RNBLEPrinter.printRawData(textTo64Buffer(result, opts), resolve, (error: Error) =>
          reject(error)
        );
      })
    }
  },
};

const NetPrinter = {
  init: (): Promise<void> =>
    new Promise((resolve, reject) =>
      RNNetPrinter.init(
        () => resolve(),
        (error: Error) => reject(error)
      )
    ),

  getDeviceList: (): Promise<INetPrinter[]> =>
    new Promise((resolve, reject) =>
      RNNetPrinter.getDeviceList(
        (printers: INetPrinter[]) => resolve(printers),
        (error: Error) => reject(error)
      )
    ),

  connectPrinter: (host: string, port: number, timeout?: number): Promise<INetPrinter> =>
    new Promise(async (resolve, reject) => {
      try {
        await connectToHost(host, timeout)
        RNNetPrinter.connectPrinter(
          host,
          port,
          (printer: INetPrinter) => resolve(printer),
          (error: Error) => reject(error)
        )
      } catch (error) {
        reject(error?.message || `Connect to ${host} fail`)
      }
    }
    ),

  closeConn: (): Promise<void> =>
    new Promise((resolve) => {
      RNNetPrinter.closeConn();
      resolve();
    }),

  printText: (text: string, opts = {}): Promise<void> => {
    if (Platform.OS === "ios") {
      return new Promise((resolve, reject) => {
        const processedText = textPreprocessingIOS(text, false, false);
        RNNetPrinter.printRawData(
          processedText.text,
          processedText.opts,
          resolve,
          (error: Error) => reject(error)
        );
      })
    } else {
      return new Promise((resolve, reject) => {
        RNNetPrinter.printRawData(textTo64Buffer(text, opts), resolve, (error: Error) =>
          reject(error)
        );
      })
    }
  },

  printBill: (text: string, opts: PrinterOptions = {}): Promise<void> => {
    if (Platform.OS === "ios") {
      return new Promise((resolve, reject) => {
        const processedText = textPreprocessingIOS(text, opts?.cut ?? true, opts.beep ?? true);
        RNNetPrinter.printRawData(
          processedText.text,
          processedText.opts,
          resolve,
          (error: Error) => reject(error));
      })
    } else {
      return new Promise((resolve, reject) => {
        RNNetPrinter.printRawData(billTo64Buffer(text, opts), resolve, (error: Error) =>
          reject(error)
        );
      })
    }
  },
  /**
   * image url
   * @param imgUrl
   * @param opts
   */
  printImage: (imgUrl: string, opts: PrinterImageOptions = {}): Promise<void> => {
    if (Platform.OS === "ios") {
      return new Promise((resolve, reject) => {
        RNNetPrinter.printImageData(imgUrl, opts, resolve, (error: Error) => reject(error));
      })
    } else {
      return new Promise((resolve, reject) => {
        RNNetPrinter.printImageData(imgUrl, opts?.imageWidth ?? 0, opts?.imageHeight ?? 0, opts?.tailingLine ?? true,
          resolve,
          (error: Error) => reject(error));
      })
    }
  },
  /**
   * base 64 string
   * @param Base64
   * @param opts
   */
  printImageBase64: (Base64: string, opts: PrinterImageOptions = {}): Promise<void> => {
    if (Platform.OS === "ios") {
      return new Promise((resolve, reject) => {
        RNNetPrinter.printImageBase64(Base64, opts, resolve, (error: Error) => reject(error));
      })
    } else {
      return new Promise((resolve, reject) => {
        RNNetPrinter.printImageBase64(Base64, opts?.imageWidth ?? 0, opts?.imageHeight ?? 0, opts?.tailingLine ?? true, resolve, (error: Error) => reject(error));

      })
    }
  },

  /**
   * Android print with encoder
   * @param text
   */
  printRaw: (text: string): Promise<void> => {
    if (Platform.OS === "ios") {
      return Promise.resolve()
    } else {
      return new Promise((resolve, reject) => {
        RNNetPrinter.printRawData(text, resolve, (error: Error) =>
          reject(error)
        );
      })
    }
  },

  /**
   * `columnWidth`
   * 80mm => 46 character
   * 58mm => 30 character
   */
  printColumnsText: (texts: string[], columnWidth: number[], columnAliment: (ColumnAliment)[],
    columnStyle: string[] = [], opts: PrinterOptions = {}): Promise<void> => {
    const result = processColumnText(texts, columnWidth, columnAliment, columnStyle)
    if (Platform.OS === "ios") {
      return new Promise((resolve, reject) => {
        const processedText = textPreprocessingIOS(result, false, false);
        RNNetPrinter.printRawData(
          processedText.text,
          processedText.opts,
          resolve,
          (error: Error) => reject(error)
        );
      })
    } else {
      return new Promise((resolve, reject) => {
        RNNetPrinter.printRawData(textTo64Buffer(result, opts), resolve,(error: Error) =>
          reject(error)
        );
      })
    }
  },
};

const NetPrinterEventEmitter = Platform.OS === 'ios' ? new NativeEventEmitter(RNNetPrinter) : new NativeEventEmitter();

export {
  COMMANDS,
  NetPrinter,
  BLEPrinter,
  USBPrinter,
  NetPrinterEventEmitter
};

export enum RN_THERMAL_RECEIPT_PRINTER_EVENTS {
  EVENT_NET_PRINTER_SCANNED_SUCCESS = "scannerResolved",
  EVENT_NET_PRINTER_SCANNING = "scannerRunning",
  EVENT_NET_PRINTER_SCANNED_ERROR = "registerError",
}