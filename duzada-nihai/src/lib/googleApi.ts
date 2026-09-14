import { getCachedAccessToken } from './firebase';

/**
 * Generic helper to make authenticated requests to Google APIs.
 */
async function googleFetch(url: string, options: RequestInit = {}) {
  const token = getCachedAccessToken();
  if (!token) {
    throw new Error('Google Workspace bağlantısı bulunamadı. Lütfen önce giriş yapın veya bağlantıyı yenileyin.');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let errorMsg = `Google API hatası: ${response.statusText}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.error?.message || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Google Drive APIs
 */
export async function listDriveFiles(searchQuery = '') {
  let url = 'https://www.googleapis.com/drive/v3/files?pageSize=30&fields=files(id,name,mimeType,webViewLink,iconLink,thumbnailLink)';
  if (searchQuery) {
    const escapedQuery = searchQuery.replace(/'/g, "\\'");
    url += `&q=name contains '${escapedQuery}' and trashed = false`;
  } else {
    url += '&q=trashed = false';
  }
  const data = await googleFetch(url);
  return data.files || [];
}

export async function uploadTextFileToDrive(fileName: string, content: string) {
  const metadata = {
    name: fileName,
    mimeType: 'text/plain',
  };

  const boundary = 'foo_bar_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
    content +
    closeDelimiter;

  const token = getCachedAccessToken();
  if (!token) throw new Error('Bağlantı bulunamadı.');

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Drive dosyası yüklenemedi.');
  }

  return res.json();
}

/**
 * Google Docs APIs
 */
export async function createGoogleDoc(title: string, bodyContent: string) {
  // 1. Create empty document
  const docObj = await googleFetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });

  const documentId = docObj.documentId;

  // 2. Insert content into the document if it has content
  if (bodyContent && documentId) {
    await googleFetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: bodyContent,
            },
          },
        ],
      }),
    });
  }

  return docObj;
}

/**
 * Google Sheets APIs
 */
export async function createGoogleSheet(title: string, headers: string[], rows: string[][]) {
  // 1. Create spreadsheet
  const sheetObj = await googleFetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
    }),
  });

  const spreadsheetId = sheetObj.spreadsheetId;

  // 2. Append header and rows
  if (spreadsheetId) {
    const values = [headers, ...rows];
    await googleFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        body: JSON.stringify({
          values,
        }),
      }
    );
  }

  return sheetObj;
}

/**
 * Google Calendar APIs
 */
export async function listCalendarEvents() {
  const now = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    now
  )}&orderBy=startTime&singleEvents=true&maxResults=10`;
  const data = await googleFetch(url);
  return data.items || [];
}

export async function createCalendarEvent(summary: string, description: string, date: string, startTime: string, endTime: string) {
  const startDateTime = `${date}T${startTime}:00`;
  const endDateTime = `${date}T${endTime}:00`;

  const body = {
    summary,
    description,
    start: {
      dateTime: startDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul',
    },
    end: {
      dateTime: endDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul',
    },
  };

  return googleFetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
