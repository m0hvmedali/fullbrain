
/**
 * Google Drive API Utilities - High Performance Version
 */

const CLIENT_ID = '671438620010-scp9l4qvqa8u9qi3inpp2d5dv01b0u2q.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAZtXQNn-U0_CJzY-xxrn2w_8LiKgYclL8';

const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

let tokenClient: any = null;
let gapiInited = false;
let pickerInited = false;
let accessToken: string | null = null;

export const initGoogleDrive = () => {
  const gapi = (window as any).gapi;
  const google = (window as any).google;

  if (!gapi || !google) {
    setTimeout(initGoogleDrive, 1000);
    return;
  }

  gapi.load('client', async () => {
    try {
      await gapi.client.init({ apiKey: API_KEY, discoveryDocs: DISCOVERY_DOCS });
      gapiInited = true;
    } catch (e) { console.error("GAPI Init Error:", e); }
  });

  gapi.load('picker', () => { pickerInited = true; });

  if (CLIENT_ID) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp: any) => { if (resp.access_token) accessToken = resp.access_token; },
    });
  }
};

export type DriveSelection = { id: string, name: string, isFolder: boolean };

export const openPicker = async (): Promise<DriveSelection | null> => {
  const google = (window as any).google;
  
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject(new Error("Client not ready"));

    tokenClient.callback = async (response: any) => {
      if (response.error) return reject(response.error);
      accessToken = response.access_token;
      
      const view = new google.picker.DocsView(google.picker.ViewId.DOCS);
      view.setIncludeFolders(true);
      
      const picker = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(API_KEY)
        .setCallback((data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs[0];
            resolve({ id: doc.id, name: doc.name, isFolder: doc.mimeType === 'application/vnd.google-apps.folder' });
          } else if (data.action === google.picker.Action.CANCEL) resolve(null);
        })
        .build();
      picker.setVisible(true);
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

/**
 * استخدام Fetch مباشرة لتحميل الملفات الكبيرة لتجنب مشاكل ذاكرة GAPI
 */
export const fetchFileContent = async (fileId: string): Promise<string> => {
  if (!accessToken) throw new Error("No Access Token");
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error("Failed to fetch file");
  return await response.text();
};

export const fetchFolderFiles = async (folderId: string): Promise<{ id: string, name: string }[]> => {
  const gapi = (window as any).gapi;
  const response = await gapi.client.drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType)',
  });
  return (response.result.files || []).filter((f: any) => f.mimeType !== 'application/vnd.google-apps.folder');
};
