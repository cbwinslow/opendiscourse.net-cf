const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { fromIni } = require('@aws-sdk/credential-provider-ini');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const config = {
  s3: {
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    region: 'auto',
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  },
  bucket: 'opendiscourse-documents',
  dataSources: [
    {
      name: 'congress-gov',
      url: 'https://www.congress.gov/help/field-values/congress-legislation.xml',
      type: 'xml',
    },
    {
      name: 'govinfo',
      url: 'https://www.govinfo.gov/bulkdata',
      type: 'sitemap',
    },
  ],
};

// Initialize S3 client
const s3Client = new S3Client({
  ...config.s3,
  credentials: fromIni({ profile: 'default' }),
});

async function fetchData(source) {
  try {
    console.log(`Fetching data from ${source.name}...`);
    const response = await axios.get(source.url, {
      headers: {
        'User-Agent': 'OpenDiscourse/1.0 (https://opendiscourse.net; contact@opendiscourse.net)',
      },
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from ${source.name}:`, error.message);
    return null;
  }
}

async function uploadToR2(key, data) {
  const params = {
    Bucket: config.bucket,
    Key: key,
    Body: data,
    ContentType: 'application/json',
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    console.log(`Successfully uploaded ${key} to R2`);
    return true;
  } catch (error) {
    console.error(`Error uploading ${key} to R2:`, error);
    return false;
  }
}

async function processDataSource(source) {
  const data = await fetchData(source);
  if (!data) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-'));
  const key = `ingest/${source.name}/${timestamp}.${source.type}`;
  
  await uploadToR2(key, data);
  
  // Process the data further (parse, transform, etc.)
  // This would be extended based on the specific data format
  console.log(`Processed data from ${source.name}`);
}

async function main() {
  console.log('Starting government data ingestion...');
  
  for (const source of config.dataSources) {
    await processDataSource(source);
  }
  
  console.log('Data ingestion completed');
}

// Run the ingestion
main().catch(console.error);
