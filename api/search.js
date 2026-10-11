export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query?.q || '';
  if (!query) {
    return res.status(200).json([]);
  }

  try {
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://www.youtube.com/results?search_query=${encoded}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'th,en-US;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(200).json([]);
    }

    const html = await response.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/);

    const results = [];
    if (match && match[1]) {
      try {
        const data = JSON.parse(match[1]);
        const contents =
          data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
            ?.sectionListRenderer?.contents || [];

        for (const section of contents) {
          const itemSection = section?.itemSectionRenderer?.contents || [];
          for (const item of itemSection) {
            const vr = item?.videoRenderer;
            if (vr) {
              const vidId = vr.videoId;
              const title = vr.title?.runs?.[0]?.text || '';
              const channel = vr.ownerText?.runs?.[0]?.text || '';
              const views = vr.viewCountText?.simpleText || '';
              const published = vr.publishedTimeText?.simpleText || '';
              const duration = vr.lengthText?.simpleText || '';
              const thumbnails = vr.thumbnail?.thumbnails || [];
              const thumb =
                thumbnails.length > 0
                  ? thumbnails[thumbnails.length - 1].url
                  : `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;

              if (vidId && title) {
                results.push({
                  id: vidId,
                  title,
                  channel,
                  views,
                  published,
                  duration,
                  thumbnail: thumb,
                });
              }
            }
          }
        }
      } catch (parseErr) {
        console.error('Error parsing ytInitialData:', parseErr);
      }
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(results);
  } catch (err) {
    console.error('YouTube search error:', err);
    return res.status(200).json([]);
  }
}
