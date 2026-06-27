export type SupplierCatalogRow = {
  toolId: string;
  title: string;
  groupName: string;
  price: number;
  deliveryTime?: string;
  requiredFields?: string;
};

export type SyncChangeEntry = {
  kind: 'imei' | 'server';
  serviceId: string;
  toolId: string | null;
  title: string;
  action:
    | 'price_auto_adjusted'
    | 'price_change_pending'
    | 'title_updated'
    | 'disabled_missing'
    | 'disabled_high_reject';
  oldSupplierPrice?: number;
  newSupplierPrice?: number;
  oldRetailPrice?: number;
  newRetailPrice?: number;
  oldTitle?: string;
  newTitle?: string;
};

export type ApplyCatalogResult = {
  checked: number;
  updated: number;
  disabled: number;
  pendingReconnect: boolean;
  changes: SyncChangeEntry[];
};
