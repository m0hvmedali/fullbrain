
/**
 * Google Drive API Utilities
 * Encapsulates OAuth2, Picker, and Files API interaction.
 */

const getEnv = (key: string) => (globalThis as any).process?.env?.[key] || '';

// استخدام المفاتيح التي قدمها المستخدم كقيم افتراضية
const CLIENT_ID = getEnv('GDRIVE_CLIENT_ID');
const API_KEY = getEnv('GDRIVE_API_KEY');


const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

let tokenClient: any = null;
let gapiInited = false;
let pickerInited = false;

export const initGoogleDrive = () => {
  const gapi = (window as any).gapi;
  const google = (window as any).google;

  if (!gapi || !google) {
    console.warn("Google APIs not loaded in window.");
    return;
  }

  // Initialize GAPI client for Drive API calls
  if (API_KEY) {
    gapi.load('client', async () => {
      try {
        await gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        });
        gapiInited = true;
        // Load Picker library
        gapi.load('picker', () => { 
          pickerInited = true;
          console.log('Picker library fully loaded'); 
        });
      } catch (e) {
        console.error("GAPI Init error:", e);
      }
    });
  }

  // Initialize GIS client for OAuth2
  if (CLIENT_ID && CLIENT_ID.trim() !== "") {
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // Defined later in openPicker
      });
    } catch (e) {
      console.error("GIS Init error:", e);
    }
  }
};

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

export const openPicker = async (): Promise<string | null> => {
  const google = (window as any).google;
  const gapi = (window as any).gapi;

  // الانتظار قليلاً إذا لم تكن المكتبة جاهزة بعد
  let attempts = 0;
  while (!pickerInited && attempts < 10) {
    await wait(500);
    attempts++;
  }

  if (!pickerInited) {
    throw new Error("مكتبة Google Picker لم تكتمل في التحميل بعد. يرجى المحاولة مرة أخرى.");
  }

  return new Promise((resolve, reject) => {
    if (!CLIENT_ID || CLIENT_ID.trim() === "" || !API_KEY || API_KEY.trim() === "") {
      reject(new Error("GDRIVE_CLIENT_ID or GDRIVE_API_KEY is missing."));
      return;
    }

    if (!tokenClient) {
      reject(new Error("Token client not initialized."));
      return;
    }

    tokenClient.callback = async (response: any) => {
      if (response.error !== undefined) {
        reject(new Error(`OAuth Error: ${response.error}`));
        return;
      }
      
      const accessToken = response.access_token;
      
      try {
        // إنشاء الـ View بطريقة أكثر أماناً
        const docsView = new google.picker.DocsView();
        docsView.setIncludeFolders(true);
        docsView.setMimeTypes('application/vnd.google-apps.folder');
        
        // التحقق من وجود الوظيفة قبل الاستدعاء لتجنب TypeError في المتصفحات المختلفة
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
    throw new Error("GAPI client not initialized.");
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
