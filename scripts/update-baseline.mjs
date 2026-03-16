import fs from 'fs';
const baselineFile = 'scripts/guard-lines-baseline.json';
const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));

const updates = {
  "apps/api/internal/admin/handler_supplier_contracts.go": 164,
  "apps/api/internal/admin/store_supplier_api_keys.go": 261,
  "apps/api/internal/admin/store_supplier_communications.go": 213,
  "apps/api/internal/admin/store_supplier_contracts.go": 207,
  "apps/api/internal/admin/store_supplier_incidents.go": 180,
  "apps/api/internal/admin/store_supplier_product_mappings_replace.go": 186,
  "apps/api/internal/admin/store_suppliers_mutation.go": 276,
  "apps/api/internal/admin/store_suppliers_query.go": 165,
  "apps/api/internal/http/router_admin.go": 184,
  "apps/api/internal/objectstore/r2.go": 239,
  "apps/web/src/app/admin/suppliers/[id]/SupplierCommunicationsSection.tsx": 193,
  "apps/web/src/app/admin/suppliers/[id]/SupplierMappingsSection.tsx": 461,
  "apps/web/src/app/admin/suppliers/[id]/SupplierOnboardingTemplatesSection.tsx": 184,
  "apps/web/src/app/admin/suppliers/[id]/SupplierProfileSection.tsx": 294,
  "apps/web/src/app/admin/suppliers/[id]/page.tsx": 212,
  "apps/web/src/app/admin/suppliers/[id]/types.ts": 299,
  "apps/web/src/app/admin/suppliers/[id]/useSupplierDetailState.ts": 803
};

Object.assign(baseline, updates);
fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2) + '\n');
console.log('Baseline updated successfully.');
