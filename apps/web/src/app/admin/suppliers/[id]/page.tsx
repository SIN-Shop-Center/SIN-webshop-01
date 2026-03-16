'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { SupplierCatalogSection } from './SupplierCatalogSection'
import { SupplierAuditLogSection } from './SupplierAuditLogSection'
import { SupplierCommunicationsSection } from './SupplierCommunicationsSection'
import { SupplierAPIKeysSection } from './SupplierAPIKeysSection'
import { SupplierSLASection } from './SupplierSLASection'
import { SupplierWebhookTestSection } from './SupplierWebhookTestSection'
import { SupplierContractsSection } from './SupplierContractsSection'
import { SupplierCredentialsSection } from './SupplierCredentialsSection'
import { SupplierDetailHeader } from './SupplierDetailHeader'
import { SupplierJourneySection } from './SupplierJourneySection'
import { SupplierMappingsSection } from './SupplierMappingsSection'
import { SupplierOnboardingSection } from './SupplierOnboardingSection'
import { SupplierOnboardingTemplatesSection } from './SupplierOnboardingTemplatesSection'
import { SupplierPerformanceSection } from './SupplierPerformanceSection'
import { SupplierProfileSection } from './SupplierProfileSection'
import { SupplierRiskSection } from './SupplierRiskSection'
import { SupplierRunConsoleSection } from './SupplierRunConsoleSection'
import { SupplierRunsSection } from './SupplierRunsSection'
import { useSupplierDetailState } from './useSupplierDetailState'

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>()
  const supplierID = useMemo(() => params?.id || '', [params])
  const state = useSupplierDetailState(supplierID)

  return (
    <main className="pb-10">
      <SupplierDetailHeader
        supplierID={supplierID}
        supplier={state.supplier}
        mappingCount={state.mappings.length}
        loading={state.loading}
        onRefresh={() => void state.loadAll({ keepSelectedRun: true })}
      />

      {state.error ? <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p> : null}
      {state.notice ? <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.notice}</p> : null}
      {state.loading ? <p className="text-sm text-brand-text-muted">Lade Supplier-Details…</p> : null}

      {!state.loading ? (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <SupplierJourneySection supplier={state.supplier} mappingCount={state.mappings.length} automationHealth={state.automationHealth} />

          <SupplierOnboardingSection
            registrationURL={state.supplier?.registration_url}
            portalURL={state.supplier?.portal_url}
            latestRun={state.supplier?.latest_run}
            executionMode={state.executionMode}
            skillID={state.skillID}
            dryRun={state.dryRun}
            startingRun={state.startingRun}
            updatingRunStatus={state.updatingRunStatus}
            onExecutionModeChange={state.setExecutionMode}
            onSkillIDChange={state.setSkillID}
            onDryRunChange={state.setDryRun}
            onStartRun={(override) => void state.startRun(override)}
            onMarkAwaitingHuman={() => void state.patchRunStatus('awaiting_human')}
            onMarkConnected={() => void state.patchRunStatus('succeeded')}
            onMarkFailed={() => void state.patchRunStatus('failed', 'manual_admin_rejection')}
          />


          <SupplierOnboardingTemplatesSection
            supplierFulfillmentMode={state.supplierFulfillmentMode}
            supplierAutoFulfillEnabled={state.supplierAutoFulfillEnabled}
            supplierOnboardingStatus={state.supplierOnboardingStatus}
            supplierComplianceState={state.supplierComplianceState}
            executionMode={state.executionMode}
            skillID={state.skillID}
            dryRun={state.dryRun}
            onSupplierFulfillmentModeChange={state.setSupplierFulfillmentMode}
            onSupplierAutoFulfillEnabledChange={state.setSupplierAutoFulfillEnabled}
            onSupplierOnboardingStatusChange={state.setSupplierOnboardingStatus}
            onSupplierComplianceStateChange={state.setSupplierComplianceState}
            onExecutionModeChange={state.setExecutionMode}
            onSkillIDChange={state.setSkillID}
            onDryRunChange={state.setDryRun}
            onNotice={state.setNotice}
          />

          <SupplierPerformanceSection performance={state.performance} />

          <SupplierRiskSection
            supplier={state.supplier}
            contracts={state.contracts}
            performance={state.performance}
            mappingCount={state.mappings.length}
          />

          <SupplierProfileSection
            supplier={state.supplier}
            mappingCount={state.mappings.length}
            supplierStatus={state.supplierStatus}
            supplierOnboardingStatus={state.supplierOnboardingStatus}
            supplierComplianceState={state.supplierComplianceState}
            complianceDocumentsReceived={state.complianceDocumentsReceived}
            complianceTaxIDVerified={state.complianceTaxIDVerified}
            complianceBankDetailsVerified={state.complianceBankDetailsVerified}
            supplierFulfillmentMode={state.supplierFulfillmentMode}
            supplierAutoFulfillEnabled={state.supplierAutoFulfillEnabled}
            supplierRegistrationURL={state.supplierRegistrationURL}
            supplierPortalURL={state.supplierPortalURL}
            supplierContactEmail={state.supplierContactEmail}
            supplierAPIEndpoint={state.supplierAPIEndpoint}
            savingSupplier={state.savingSupplier}
            onSupplierStatusChange={state.setSupplierStatus}
            onSupplierOnboardingStatusChange={state.setSupplierOnboardingStatus}
            onSupplierComplianceStateChange={state.setSupplierComplianceState}
            onComplianceDocumentsReceivedChange={state.setComplianceDocumentsReceived}
            onComplianceTaxIDVerifiedChange={state.setComplianceTaxIDVerified}
            onComplianceBankDetailsVerifiedChange={state.setComplianceBankDetailsVerified}
            onSupplierFulfillmentModeChange={state.setSupplierFulfillmentMode}
            onSupplierAutoFulfillEnabledChange={state.setSupplierAutoFulfillEnabled}
            onSupplierRegistrationURLChange={state.setSupplierRegistrationURL}
            onSupplierPortalURLChange={state.setSupplierPortalURL}
            onSupplierContactEmailChange={state.setSupplierContactEmail}
            onSupplierAPIEndpointChange={state.setSupplierAPIEndpoint}
            specializationTags={state.specializationTags}
            onSpecializationTagsChange={state.setSpecializationTags}
            onSave={() => void state.saveSupplierSetup()}
          />

          <SupplierCredentialsSection
            credentialsProvider={state.credentialsProvider}
            credentialsUsername={state.credentialsUsername}
            credentialsSecret={state.credentialsSecret}
            credentialsMetadata={state.credentialsMetadata}
            hasSecret={state.hasSecret}
            savingCredentials={state.savingCredentials}
            onProviderChange={state.setCredentialsProvider}
            onUsernameChange={state.setCredentialsUsername}
            onSecretChange={state.setCredentialsSecret}
            onMetadataChange={state.setCredentialsMetadata}
            onSave={() => void state.saveCredentials()}
          />

          <SupplierAPIKeysSection
            apiKeys={state.apiKeys}
            creatingKey={state.creatingKey}
            onCreateKey={state.createAPIKey}
            onRevokeKey={state.revokeAPIKey}
          />

          <SupplierSLASection
            slaAckHours={state.slaAckHours}
            slaFulfillmentHours={state.slaFulfillmentHours}
            paymentTermsDays={state.paymentTermsDays}
            earlyPaymentDiscountPct={state.earlyPaymentDiscountPct}
            earlyPaymentDiscountDays={state.earlyPaymentDiscountDays}
            savingSupplier={state.savingSupplier}
            onSlaAckHoursChange={state.setSlaAckHours}
            onSlaFulfillmentHoursChange={state.setSlaFulfillmentHours}
            onPaymentTermsDaysChange={state.setPaymentTermsDays}
            onEarlyPaymentDiscountPctChange={state.setEarlyPaymentDiscountPct}
            onEarlyPaymentDiscountDaysChange={state.setEarlyPaymentDiscountDays}
            onSave={() => void state.saveSupplierSetup()}
          />

          <SupplierWebhookTestSection
            supplierID={supplierID}
            onTestInbound={state.testWebhookInbound}
            onTestOutbound={state.testWebhookOutbound}
          />

          <SupplierCatalogSection
            items={state.catalogProducts}
            syncingCatalog={state.syncingCatalog}
            notice={state.syncingCatalog ? 'Sync läuft…' : null}
            importingCatalogProductID={state.importingCatalogProductID}
            onSync={() => void state.syncCatalog()}
            onImport={(catalogProductID) => void state.importCatalogProduct(catalogProductID)}
          />

          <SupplierCommunicationsSection
            communications={state.communications}
            defaultRecipient={state.supplierContactEmail}
            sendingCommunication={state.sendingCommunication}
            onSendEmail={state.sendCommunicationEmail}
          />

          <SupplierAuditLogSection entries={state.auditLog} />

          <SupplierContractsSection
            contracts={state.contracts}
            uploadingContract={state.uploadingContract}
            onUploadContract={state.uploadContract}
            onDownloadContract={state.downloadContract}
          />

          <SupplierMappingsSection
            supplier={state.supplier}
            mappings={state.mappings}
            savingMappings={state.savingMappings}
            onAddMapping={state.addMapping}
            onUpdateMapping={state.updateMapping}
            onRemoveMapping={state.removeMapping}
            onReplaceMappings={state.replaceMappings}
            onSaveMappings={() => void state.saveMappings()}
          />

          <SupplierRunsSection runs={state.runs} selectedRunID={state.selectedRunID} onSelectRun={state.setSelectedRunID} />

          <SupplierRunConsoleSection runDetail={state.runDetail} />
        </div>
      ) : null}
    </main>
  )
}
