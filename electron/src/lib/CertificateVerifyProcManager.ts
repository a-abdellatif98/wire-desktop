/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import * as certificateUtils from '@wireapp/certificate-check';
import {dialog} from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';

import {getText} from '../locale/locale';
import {getLogger} from '../logging/getLogger';
import * as EnvironmentUtil from '../runtime/EnvironmentUtil';

const logger = getLogger(path.basename(__filename));

interface DisplayCertificateErrorOptions {
  bypassDialogLock: boolean;
  isCheckboxChecked: boolean;
  isChromiumError: boolean;
}

class CertificateVerifyProcManager {
  private static bypassCertificatePinning = false;
  private static isDialogLocked = false;
  public static mainWindow: Electron.BrowserWindow;

  private static readonly dialogUnlockTimeout = 6000;

  public static readonly CHROMIUM_ERRORS = {
    CERT_AUTHORITY_INVALID: -202,
    CERT_COMMON_NAME_INVALID: -200,
  };

  private static readonly RESPONSE = {
    GO_BACK: 0,
    RETRY: 0,
    SAVE_CERTIFICATE: 1,
    SHOW_DETAILS: 1,
  };

  private static readonly LOCALE = {
    RETRY: getText('certificateVerifyProcManagerRetry'),
    SHOW_DETAILS: getText('certificateVerifyProcManagerShowDetails'),
    SHOW_DETAILS_GO_BACK: getText('certificateVerifyProcManagerShowDetailsGoBack'),
    SHOW_DETAILS_SAVE_CERTIFICATE: getText('certificateVerifyProcManagerShowDetailsSaveCertificate'),
    SHOW_DETAILS_TEXT_CHROMIUM: getText('certificateVerifyProcManagerShowDetailsTextChromium'),
    SHOW_DETAILS_TEXT_PINNING: getText('certificateVerifyProcManagerShowDetailsTextPinning'),
    SHOW_DETAILS_TITLE: getText('certificateVerifyProcManagerShowDetailsTitle'),
    WARNING_BYPASS: getText('certificateVerifyProcManagerWarningBypass'),
    WARNING_TEXT_CHROMIUM: getText('certificateVerifyProcManagerWarningTextChromium'),
    WARNING_TEXT_PINNING: getText('certificateVerifyProcManagerWarningTextPinning'),
    WARNING_TITLE: getText('certificateVerifyProcManagerWarningTitle'),
  };

  private static displayCertificateDetails(
    hostname: string,
    certificate: Electron.Certificate,
    options: DisplayCertificateErrorOptions,
  ): void {
    const goBack = () => {
      // Go back to the dialog
      this.displayCertificateError(hostname, certificate, {
        ...options,
        bypassDialogLock: true,
      });
    };

    const textDetails = `${
      options.isChromiumError ? this.LOCALE.SHOW_DETAILS_TEXT_CHROMIUM : this.LOCALE.SHOW_DETAILS_TEXT_PINNING
    } ${hostname}`;

    const isTrustDialogSupported = EnvironmentUtil.platform.IS_MAC_OS;
    if (isTrustDialogSupported) {
      dialog.showCertificateTrustDialog(
        this.mainWindow,
        {
          certificate,
          message: textDetails,
        },
        goBack,
      );
    } else {
      // For Linux and Windows, use a message box with the ability to save the certificate
      dialog.showMessageBox(
        this.mainWindow,
        {
          buttons: [this.LOCALE.SHOW_DETAILS_GO_BACK, this.LOCALE.SHOW_DETAILS_SAVE_CERTIFICATE],
          cancelId: this.RESPONSE.GO_BACK,
          detail: textDetails,
          message: this.LOCALE.SHOW_DETAILS_TITLE,
          type: 'info',
        },
        (response: number) => {
          switch (response) {
            case this.RESPONSE.SAVE_CERTIFICATE: {
              dialog.showSaveDialog(
                this.mainWindow,
                {
                  defaultPath: `${hostname}.pem`,
                },
                async chosenPath => {
                  if (chosenPath !== undefined) {
                    await fs.writeFile(chosenPath, Buffer.from(certificate.data));
                  }
                  // Go back on details window
                  this.displayCertificateDetails(hostname, certificate, options);
                },
              );
              break;
            }

            case this.RESPONSE.GO_BACK: {
              goBack();
              break;
            }
          }
        },
      );
    }
  }

  public static isCertificatePinningEnabled(): boolean {
    return !this.bypassCertificatePinning;
  }

  public static displayCertificateChromiumError(hostname: string, certificate: Electron.Certificate): void {
    this.displayCertificateError(hostname, certificate, {isChromiumError: true});
  }

  public static displayCertificateError(
    hostname: string,
    certificate: Electron.Certificate,
    options?: Partial<DisplayCertificateErrorOptions>,
  ): void {
    const {bypassDialogLock, isChromiumError, isCheckboxChecked} = {
      bypassDialogLock: false,
      isCheckboxChecked: false,
      isChromiumError: false,
      ...options,
    };
    if (this.isDialogLocked && !bypassDialogLock) {
      return;
    }
    this.isDialogLocked = true;

    dialog.showMessageBox(
      this.mainWindow,
      {
        buttons: [this.LOCALE.RETRY, this.LOCALE.SHOW_DETAILS],
        cancelId: this.RESPONSE.RETRY,
        checkboxChecked: isChromiumError ? undefined : isCheckboxChecked,
        checkboxLabel: isChromiumError ? undefined : this.LOCALE.WARNING_BYPASS,
        defaultId: this.RESPONSE.RETRY,
        detail: isChromiumError ? this.LOCALE.WARNING_TEXT_CHROMIUM : this.LOCALE.WARNING_TEXT_PINNING,
        message: this.LOCALE.WARNING_TITLE,
        type: 'warning',
      },
      (response: number, checkboxChecked: boolean) => {
        switch (response) {
          case this.RESPONSE.RETRY: {
            if (!isChromiumError) {
              this.bypassCertificatePinning = checkboxChecked;
              if (this.bypassCertificatePinning) {
                logger.log('User disabled certificate pinning');
              }
            }

            // Postpone unlocking of the dialog so the user have time to leave the app
            setTimeout(() => (this.isDialogLocked = false), this.dialogUnlockTimeout);
            break;
          }

          case this.RESPONSE.SHOW_DETAILS: {
            this.displayCertificateDetails(hostname, certificate, {
              bypassDialogLock,
              isCheckboxChecked: checkboxChecked,
              isChromiumError,
            });
            break;
          }
        }
      },
    );
  }
}

export const attachTo = (main: Electron.BrowserWindow) => {
  CertificateVerifyProcManager.mainWindow = main;
};

export const setCertificateVerifyProc = (
  request: Electron.CertificateVerifyProcRequest,
  cb: (verificationResult: number) => void,
) => {
  const {hostname, certificate, verificationResult, errorCode} = request;

  // Check browser results
  if (verificationResult !== 'net::OK') {
    logger.error(
      `Internal Chrome TLS verification failed. Hostname: ${hostname}. Verification result: ${verificationResult}. Error code: ${errorCode}`,
    );

    const isCommonCertificateError =
      errorCode === CertificateVerifyProcManager.CHROMIUM_ERRORS.CERT_COMMON_NAME_INVALID ||
      errorCode === CertificateVerifyProcManager.CHROMIUM_ERRORS.CERT_AUTHORITY_INVALID;
    if (isCommonCertificateError) {
      CertificateVerifyProcManager.displayCertificateChromiumError(hostname, certificate);
    }

    return cb(-2);
  }

  // Check certificate pinning
  if (certificateUtils.hostnameShouldBePinned(hostname) && CertificateVerifyProcManager.isCertificatePinningEnabled()) {
    const pinningResults = certificateUtils.verifyPinning(hostname, certificate);
    const falsyValue = Object.values(pinningResults).some(val => val === false);

    if (falsyValue || pinningResults.errorMessage) {
      logger.error(`Certificate verification failed for "${hostname}".`);
      logger.error(`Error: "${pinningResults.errorMessage}". Displaying certificate pinning error dialog.`);
      CertificateVerifyProcManager.displayCertificateError(hostname, certificate);
      return cb(-2);
    }
  }

  return cb(-3);
};
