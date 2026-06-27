import { decryptImeiApiKey } from '@/lib/crypto/imei-api-secret';
import {
  DhruFusionClient,
  DhruFusionProClient,
  isClassicDhruApiKey,
  isDhruProSkippedOrUnavailable,
  isImeiProProduct,
  isServerProProduct,
  resolveProCategoryName,
} from '@/lib/dhru-fusion';
import type { ImeiApi } from '@prisma/client';
import type { SupplierCatalogRow } from './types';

export async function fetchImeiSupplierCatalog(api: ImeiApi): Promise<{
  rows: SupplierCatalogRow[];
  apiVersion: 'pro' | 'classic';
}> {
  const apiKey = decryptImeiApiKey(api.apiKey);

  if (!isClassicDhruApiKey(apiKey)) {
    const proClient = new DhruFusionProClient({
      host: api.host,
      username: api.username,
      apiKey,
    });
    const proResult = await proClient.getProducts();
    const imeiProducts =
      proResult.success && proResult.products
        ? proResult.products.filter(isImeiProProduct)
        : [];

    if (imeiProducts.length > 0) {
      return {
        apiVersion: 'pro',
        rows: imeiProducts.map((p) => ({
          toolId: p.uuid,
          title: p.name,
          groupName:
            proResult.categories?.find((c) => p.cids.includes(c.id))?.name || 'Uncategorized',
          price: p.price,
        })),
      };
    }
  }

  const classicClient = new DhruFusionClient({
    host: api.host,
    username: api.username,
    apiKey,
  });
  const result = await classicClient.getImeiServiceList();
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch IMEI services from supplier');
  }

  return {
    apiVersion: 'classic',
    rows: result.services.map((s) => ({
      toolId: s.toolId,
      title: s.title,
      groupName: s.groupName,
      price: s.price,
      deliveryTime: s.deliveryTime,
    })),
  };
}

export async function fetchServerSupplierCatalog(api: ImeiApi): Promise<{
  rows: SupplierCatalogRow[];
  apiVersion: 'pro' | 'classic';
}> {
  const apiKey = decryptImeiApiKey(api.apiKey);
  const classicClient = new DhruFusionClient({
    host: api.host,
    username: api.username,
    apiKey,
  });

  const classicResult = await classicClient.getServerServiceList();
  if (classicResult.success && classicResult.services.length > 0) {
    return {
      apiVersion: 'classic',
      rows: classicResult.services.map((s) => ({
        toolId: s.toolId,
        title: s.title,
        groupName: s.groupName,
        price: s.price,
        deliveryTime: s.deliveryTime,
        requiredFields: s.requiredFields,
      })),
    };
  }

  if (!isClassicDhruApiKey(apiKey)) {
    const proClient = new DhruFusionProClient({
      host: api.host,
      username: api.username,
      apiKey,
    });
    const proResult = await proClient.getProducts();
    if (proResult.success && proResult.products) {
      const serverProducts = proResult.products.filter(isServerProProduct);
      if (serverProducts.length > 0) {
        return {
          apiVersion: 'pro',
          rows: serverProducts.map((p) => ({
            toolId: p.uuid,
            title: p.name,
            groupName: resolveProCategoryName(proResult.categories, p),
            price: p.price,
            requiredFields: (p.fields || []).map((f) => f.name).join(','),
          })),
        };
      }
    }

    if (!isDhruProSkippedOrUnavailable(proResult.error) && proResult.error) {
      throw new Error(proResult.error);
    }
  }

  throw new Error(classicResult.error || 'Failed to fetch server services from supplier');
}

export async function fetchSupplierBalance(api: ImeiApi): Promise<number | null> {
  const apiKey = decryptImeiApiKey(api.apiKey);
  const client = new DhruFusionClient({
    host: api.host,
    username: api.username,
    apiKey,
  });
  const res = await client.accountInfo();
  if (!res.success || res.credit == null) return null;
  const creditNum = Number(String(res.credit).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(creditNum) ? creditNum : null;
}
