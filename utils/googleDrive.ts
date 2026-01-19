
/**
 * Google Drive API Utilities
 * Encapsulates OAuth2, Picker, and Files API interaction.
 */

const getEnv = (key: string) => {
  const val = (globalThis as any).process?.env?.[key];
  if (val) return val;
  // Fallback for direct window access if needed
  return (window as any)._ENV?.[key] || '';
};

// استخدام المفاتيح التي قدمها المستخدم كقيم افتراضية
// ملاحظة: تأكد من ضبط هذه المتغيرات في البيئة أو استبدالها بمفاتيح صالحة
const CLIENT_ID = getEnv('GDRIVE_CLIENT_ID') || '671438620010-scp9l4qvqa8u9qi3inpp2d5dv01b0u2q.apps.googleusercontent.com';
const API_KEY = getEnv('GDRIVE_API_KEY') || 'AIzaSyAZtXQNn-U0_CJzY-xxrn2w_8LiKgYclL8';

const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

let tokenClient: any = null;
let gapiInited = false;
let pickerInited = false;

export const initGoogleDrive = () => {
  const gapi = (window as any).gapi;
  const google = (window as any).google;

  if (!gapi || !google) {
    console.warn("Google APIs (gapi/google) not found on window. Retrying in 1s...");
    setTimeout(initGoogleDrive, 1000);
    return;
  }

  // Load GAPI client for Drive API calls
  gapi.load('client', async () => {
    if (API_KEY) {
      try {
        await gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        });
        gapiInited = true;
        console.log('GAPI client initialized');
      } catch (e) {
        console.error("GAPI Client Init error:", e);
      }
    }
  });

  // Load Picker library independently to be more robust
  gapi.load('picker', () => {
    pickerInited = true;
    console.log('Google Picker library loaded');
  });

  // Initialize GIS client for OAuth2
  if (CLIENT_ID && CLIENT_ID.trim() !== "") {
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // Defined later in openPicker
      });
      console.log('GIS token client initialized');
    } catch (e) {
      console.error("GIS Init error:", e);
    }
  }
};

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

export const openPicker = async (): Promise<string | null> => {
  const google = (window as any).google;
  const gapi = (window as any).gapi;

  // التحقق من المفاتيح أولاً
  if (!CLIENT_ID || CLIENT_ID.trim() === "" || !API_KEY || API_KEY.trim() === "") {
    throw new Error("GDRIVE_CLIENT_ID or GDRIVE_API_KEY is missing. Please check your configuration.");
  }

  // الانتظار حتى اكتمال تحميل المكتبات (بحد أقصى 10 ثوانٍ)
  let attempts = 0;
  while (!pickerInited && attempts < 20) {
    console.log(`Waiting for Picker library... attempt ${attempts + 1}`);
    await wait(500);
    attempts++;
  }

  if (!pickerInited) {
    throw new Error("مكتبة Google Picker لم تكتمل في التحميل بعد. يرجى التحقق من اتصال الإنترنت أو وجود مانع إعلانات (Ad-blocker) يحظر خدمات Google.");
  }

  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      // محاولة إعادة التهيئة إذا كان tokenClient مفقوداً
      initGoogleDrive();
      if (!tokenClient) {
        reject(new Error("Token client not initialized. Make sure CLIENT_ID is correct."));
        return;
      }
    }

    tokenClient.callback = async (response: any) => {
      if (response.error !== undefined) {
        reject(new Error(`OAuth Error: ${response.error}`));
        return;
      }
      
      const accessToken = response.access_token;
      
      try {
        const docsView = new google.picker.DocsView();
        docsView.setIncludeFolders(true);
        docsView.setMimeTypes('application/vnd.google-apps.folder');
        
        // التحقق من وجود الوظيفة قبل الاستدعاء
        if (typeof docsView.setSelectableMimeTypes === 'function') {
          docsView.setSelectableMimeTypes('application/vnd.google-apps.folder');
        }

        const picker = new google.picker.PickerBuilder()
          .addView(docsView)
          .setOAuthToken(accessToken)
          .setDeveloperKey(API_KEY)
          .setCallback((data: any) => {
            if (data.action === google.picker.Action.PICKED) {
              resolve(data.docs[0].id);
            } else if (data.action === google.picker.Action.CANCEL) {
              resolve(null);
            }
          })
          .build();
          
        picker.setVisible(true);
      } catch (err) {
        console.error("Error building picker:", err);
        reject(err);
      }
    };

    if (gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
};

export const fetchFolderFiles = async (folderId: string): Promise<{ name: string, content: string }[]> => {
  const gapi = (window as any).gapi;
  
  if (!gapiInited) {
    // محاولة أخيرة للتهيئة إذا تم الاستدعاء قبل اكتمال init
    try {
      await gapi.client.init({ apiKey: API_KEY, discoveryDocs: DISCOVERY_DOCS });
      gapiInited = true;
    } catch (e) {
      throw new Error("GAPI client not initialized and failed to auto-init.");
    }
  }

  try {
    const response = await gapi.client.drive.files.list({
      q: `'${folderId}' in parents and (mimeType = 'text/plain' or mimeType = 'application/json' or mimeType = 'text/html' or mimeType = 'text/csv') and trashed = false`,
      fields: 'files(id, name, mimeType)',
    });

    const files = response.result.files;
    if (!files || files.length === 0) return [];

    const fileContents = await Promise.all(files.map(async (file: any) => {
      try {
        const contentResponse = await gapi.client.drive.files.get({
          fileId: file.id,
          alt: 'media',
        });
        return {
          name: file.name,
          content: contentResponse.body || contentResponse.result || ''
        };
      } catch (e) {
        console.warn(`Could not fetch file ${file.name}:`, e);
        return null;
      }
    }));

    return fileContents.filter(f => f !== null) as { name: string, content: string }[];
  } catch (error) {
    console.error("Error fetching folder files:", error);
    throw error;
  }
};
