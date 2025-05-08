const getCloudflareApiHeaders = () => {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!apiToken) {
    // Handle the case where the API token is not defined.
    // You might want to throw an error or return a default set of headers.
    throw new Error('CLOUDFLARE_API_TOKEN is not defined in the environment variables.');
  }

  return {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };
};

let fetch;

async function initializeFetch() {
  ({ default: fetch } = await import('node-fetch'));
}

const findDnsRecordId = async (zoneId, recordName, recordType) => {
  if (!fetch) {
    await initializeFetch();
  }
  const apiUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;
  const headers = getCloudflareApiHeaders();

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      console.error(`Cloudflare API Error: ${response.status} - ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (!data.success) {
      console.error(`Cloudflare API Error: ${JSON.stringify(data.errors)}`);
      return null;
    }

    const records = data.result;
    const foundRecord = records.find(record => record.name === recordName && record.type === recordType);

    if (foundRecord) {
      return foundRecord.id;
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error finding DNS record: ${error}`);
    return null;
  }
};

const updateDnsRecord = async (recordName, targetIp) => {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const recordType = process.env.DNS_RECORD_TYPE;

  if (!zoneId) {
    throw new Error('CLOUDFLARE_ZONE_ID is not defined in the environment variables.');
  }

  if (!recordType) {
    throw new Error('DNS_RECORD_TYPE is not defined in the environment variables.');
  }

  try {
    const recordId = await findDnsRecordId(zoneId, recordName, recordType);

    if (!recordId) {
      console.error('DNS record not found.');
      return { success: false, message: '找不到 DNS 紀錄。' };
    }

    const apiUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`;
    const headers = getCloudflareApiHeaders();

    const payload = {
      type: recordType,
      name: recordName,
      content: targetIp,
      ttl: 120, // Automatic
    };

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Cloudflare API Error: ${response.status} - ${response.statusText}`);
      return { success: false, message: `Cloudflare API 錯誤：${response.status} - ${response.statusText}` };
    }

    const data = await response.json();

    if (!data.success) {
      console.error(`Cloudflare API Error: ${JSON.stringify(data.errors)}`);
      return { success: false, message: `Cloudflare API 錯誤：${JSON.stringify(data.errors)}` };
    }

    return { success: true, message: 'DNS 更新成功。' };
  } catch (error) {
    console.error(`Error updating DNS record: ${error}`);
    return { success: false, message: `更新 DNS 紀錄時發生錯誤：${error}` };
  }
};

const getCurrentDnsRecordIp = async (recordName) => {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const recordType = process.env.DNS_RECORD_TYPE;

  if (!zoneId) {
    throw new Error('CLOUDFLARE_ZONE_ID is not defined in the environment variables.');
  }

  if (!recordType) {
    throw new Error('DNS_RECORD_TYPE is not defined in the environment variables.');
  }

  try {
    const recordId = await findDnsRecordId(zoneId, recordName, recordType);

    if (!recordId) {
      console.error('DNS record not found.');
      return null;
    }

    const apiUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`;
    const headers = getCloudflareApiHeaders();

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      console.error(`Cloudflare API Error: ${response.status} - ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (!data.success) {
      console.error(`Cloudflare API Error: ${JSON.stringify(data.errors)}`);
      return null;
    }

    return data.result.content;
  } catch (error) {
    console.error(`Error getting current DNS record IP: ${error}`);
    return null;
  }
};

module.exports = {
  getCloudflareApiHeaders,
  findDnsRecordId,
  updateDnsRecord,
  getCurrentDnsRecordIp,
};
