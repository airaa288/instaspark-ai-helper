const apiKey = '90708b6ef7b44f54b78449c4db95dd6f';

async function testNewsApi() {
  console.log('Testing NewsAPI fetch...');
  try {
    const res = await fetch(`https://newsapi.org/v2/everything?q=instagram+marketing&sortBy=publishedAt&language=en&apiKey=${apiKey}`);
    const data = await res.json();
    console.log('Status:', data.status);
    console.log('Total Results:', data.totalResults);
    if (data.articles && data.articles.length > 0) {
      console.log('Sample Article 1:', data.articles[0].title);
      console.log('Sample Article 2:', data.articles[1]?.title);
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testNewsApi();
