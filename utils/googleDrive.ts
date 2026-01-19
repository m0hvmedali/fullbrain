
/**
 * Google Drive API Utilities
 * Encapsulates OAuth2, Picker, and Files API interaction.
 */

const getEnv = (key: string) => {
  const val = (globalThis as any).process?.env?.[key];
  if (val) return val;
  return (window as any)._ENV?.[key] || '';
};

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
    setTimeout(initGoogleDrive, 1000);
    return;
  }

  gapi.load('client', async () => {
    try {
      await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
      });
      gapiInited = true;
    } catch (e) {
      console.error("GAPI Client Init error:", e);
    }
  });

  gapi.load('picker', () => {
    pickerInited = true;
  });

  if (CLIENT_ID) {
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', 
      });
    } catch (e) {
      console.error("GIS Init error:", e);
    }
  }
};

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

export type DriveSelection = { id: string, name: string, isFolder: boolean };

export const openPicker = async (): Promise<DriveSelection | null> => {
  const google = (window as any).google;
  const gapi = (window as any).gapi;

  let attempts = 0;
  while (!pickerInited && attempts < 20) {
    await wait(500);
    attempts++;
  }

  if (!pickerInited) {
    throw new Error("مكتبة Google Picker لم تكتمل في التحميل.");
  }

  return new Promise((resolve, reject) => {
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
        // عرض كافة الملفات والمجلدات بدون استثناء
        const view = new google.picker.DocsView(google.picker.ViewId.DOCS);
        view.setIncludeFolders(true);
        view.setSelectableMimeTypes(''); // السماح بكل شيء

        const picker = new google.picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(accessToken)
          .setDeveloperKey(API_KEY)
          .setCallback((data: any) => {
            if (data.action === google.picker.Action.PICKED) {
              const doc = data.docs[0];
              resolve({
                id: doc.id,
                name: doc.name,
                isFolder: doc.mimeType === 'application/vnd.google-apps.folder'
              });
            } else if (data.action === google.picker.Action.CANCEL) {
              resolve(null);
            }
          })
          .build();
          
        picker.setVisible(true);
      } catch (err) {
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

export const fetchFileContent = async (fileId: string): Promise<string> => {
  const gapi = (window as any).gapi;
  const response = await gapi.client.drive.files.get({
    fileId: fileId,
    alt: 'media',
  });
  return response.body || response.result || '';
};

export const fetchFolderFiles = async (folderId: string): Promise<{ name: string, content: string }[]> => {
  const gapi = (window as any).gapi;
  
  if (!gapiInited) {
    await gapi.client.init({ apiKey: API_KEY, discoveryDocs: DISCOVERY_DOCS });
    gapiInited = true;
  }

  const response = await gapi.client.drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType)',
  });

  const files = response.result.files || [];
  const fileContents = await Promise.all(files.map(async (file: any) => {
    try {
      // جلب محتوى الملفات النصية فقط لتجنب الملفات الثنائية الضخمة
      const content = await fetchFileContent(file.id);
      return { name: file.name, content };
    } catch (e) {
      return null;
    }
  }));

  return fileContents.filter(f => f !== null) as { name: string, content: string }[];
};
