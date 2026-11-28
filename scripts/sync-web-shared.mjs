#!/usr/bin/env node
// Keeps shared modules synchronized across customer/, operations/, and admin/ portals
// without collapsing them into a coupled workspace package.
//
//   node scripts/sync-web-shared.mjs          sync canonical copies across portals
//   node scripts/sync-web-shared.mjs --check  exit 1 if any shared file drifted across portals

import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

export const SHARED_MODULES = [
  {
    "path": "api/airspace.api.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "api/alerts.api.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "api/assistant.api.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "api/auth.api.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "api/billing.api.ts",
    "source": "customer",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "api/dashboard.api.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "api/inventory.api.ts",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "api/maintenance.api.ts",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "api/media.api.ts",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "api/missions.api.ts",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "api/notifications.api.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "api/operators.api.ts",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "api/platform-settings.api.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "api/profile.api.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "api/sar.api.ts",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "api/stations.api.ts",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "api/telemetry.api.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "api/training.api.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "api/uavs.api.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "api/users.api.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "api/weather.api.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/airspace/MissionAirspaceAdvisor.tsx",
    "source": "customer",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "components/assistant/widget/AssistantWidgetComposer.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/assistant/widget/AssistantWidgetHeader.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/assistant/widget/AssistantWidgetLauncher.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/assistant/widget/AssistantWidgetMessageList.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/assistant/widget/ChatMessages.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/assistant/widget/SuperheroLogo.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/auth/modal/PortalAuthEntry.tsx",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "components/auth/social/AppleSignInButton.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/auth/social/GoogleSignInButton.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/auth/social/OtpCodeInput.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/auth/steps/AuthPasswordRecoveryStep.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/auth/steps/AuthPortalSelectStep.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/auth/steps/AuthVerificationStep.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/customer/DispatchHotline.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/data/Drawer.tsx",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "components/data/ResourceState.tsx",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "components/data/WorkspaceState.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/layout/HeaderSearch.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/layout/PortalSwitcher.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/mission/Mission3DReplayAndTerrainCard.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/mission/MissionPermitCard.tsx",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "components/mission/MissionPermitSummary.tsx",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "components/mission/MissionPermitUpsertForm.tsx",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "components/mission/MissionRequestDetails.tsx",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "components/notification/policy/UserNotificationPreferencesCard.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/profile/AccountDeletionCard.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/profile/PasswordChangeCard.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/profile/TwoFactorSettingsCard.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/profile/TwoFactorSetupWizard.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/shared/Avatar.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/shared/DevtoolsGuard.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/shared/FilterSelect.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/shared/LanguageSelect.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/shared/LocaleFlag.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/shared/MapLayerToolbar.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/shared/MissionTimeline.tsx",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "components/shared/NotFoundView.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/shared/OfflineConnectionOverlay.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/shared/PortalErrorView.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/shared/RequiredMark.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/shared/index.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/support/SupportMessageStatusRow.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/training/catalog/TrainingDocumentMasterDetail.tsx",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "components/training/catalog/TrainingEnrollmentStatsStrip.tsx",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "components/training/editor/TrainingAssetUpload.tsx",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "components/training/editor/TrainingBulkLessonQueueList.tsx",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "components/training/editor/TrainingBulkLessonUpload.tsx",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "components/training/editor/TrainingCourseFormModal.tsx",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "components/training/editor/TrainingCourseLessonsPanel.tsx",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "components/training/editor/TrainingLessonAttachmentsEditor.tsx",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "components/training/editor/TrainingLessonEditorModal.tsx",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "components/training/editor/TrainingLessonMediaFields.tsx",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "components/training/player/MarkdownSopRenderer.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/training/player/TrainingCoursePlayer.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/training/player/TrainingLessonViewers.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/training/player/TrainingPdfToolbar.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/training/player/TrainingPdfViewer.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/training/player/TrainingPlayerCurriculumSidebar.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/training/player/TrainingPlayerLessonTabs.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/training/player/TrainingPlayerStage.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/training/player/TrainingSlidesViewer.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/training/player/TrainingVideoAndStage.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/training/player/training-pdf-helpers.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/uav/UavLifecyclePanel.tsx",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "components/uav/UavPanel.tsx",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "components/ui/Alert.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/ui/Badge.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/ui/Button.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/ui/Card.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/ui/ErrorBoundary.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/ui/FormField.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/ui/Input.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/ui/KpiCard.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/ui/LanguageSwitcher.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/ui/PageSkeleton.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/ui/PasswordInput.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/ui/Spinner.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/ui/Switch.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/ui/UavLoader.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/ui/index.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/weather/FlightWeatherWorkspace.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/weather/PreflightWeatherCard.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/weather/WeatherBackdrop.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/weather/WeatherIcon.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/weather/WeatherPointMap.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "components/weather/WeatherPortalPages.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "forms/airspace-zone-form.ts",
    "source": "customer",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "forms/auth-form.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "forms/notification-policy-form.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "forms/permit-form.ts",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "forms/profile-form.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "forms/uav-form.ts",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "hooks/airspace-query-keys.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/alerts-query-keys.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/assistant-query-keys.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/media-query-keys.ts",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "hooks/profile-query-keys.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/sar-query-keys.ts",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "hooks/support-query-keys.ts",
    "source": "customer",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "hooks/training-query-keys.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/uav-query-keys.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/useAirspace.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/useAlertCenter.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/useAlertMessage.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/useAuthFlow.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/useBrowserStorage.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/useCollection.ts",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "hooks/useDialogFocusTrap.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/useDropdownMenu.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/useMedia.ts",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "hooks/useMissionWorkflow.ts",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "hooks/useOperationMutation.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/useProfile.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/useSar.ts",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "hooks/useSidebarController.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/useSidebarCounts.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/useSidebarShortcut.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/useStations.ts",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "hooks/useSupportOutbox.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/useTelemetry.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/useUavs.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/useWeather.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/useWorkspaceTabs.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "hooks/weather-query-keys.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "i18n/config.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "lib/api/collection.ts",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "lib/api/index.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "lib/api/messages.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "lib/format.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "lib/map-config.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "lib/navigation.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "lib/query/index.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "lib/recent-pages.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "lib/typography.ts",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "lib/url-slugs.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "lib/utils.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "lib/welcome-flag.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "providers/ConfirmContext.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "providers/PortalProviders.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "providers/QueryProvider.tsx",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "types/admin.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "types/airspace.types.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "types/alerts.types.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "types/assistant.types.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "types/auth.types.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "types/dashboard.types.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "types/fleet-map.types.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "types/flight-plan.types.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "types/index.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "types/maintenance.types.ts",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "types/media-upload.types.ts",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "types/notification.types.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "types/platform-settings.types.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "types/profile.types.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "types/resources.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "types/sar.types.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "types/support.types.ts",
    "source": "customer",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "types/telemetry.types.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "types/training.types.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "types/weather.types.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "utils/attachments.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "utils/auth-entry.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "utils/avatar.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "utils/chat-groups.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "utils/clearance.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "utils/conditions.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "utils/course-helpers.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "utils/flight-window.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "utils/maintenance-workflows.ts",
    "source": "operations",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "utils/map-overlays.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "utils/media-policy.ts",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "utils/message-status.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "utils/mission-workflows.ts",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "utils/portal.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "utils/receipt-download.ts",
    "source": "customer",
    "targets": [
      "admin"
    ]
  },
  {
    "path": "utils/runtime-error.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "utils/sar-algorithms.ts",
    "source": "customer",
    "targets": [
      "operations"
    ]
  },
  {
    "path": "utils/sky-theme.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "utils/uav-3d-loader.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  },
  {
    "path": "utils/uav-workflows.ts",
    "source": "customer",
    "targets": [
      "operations",
      "admin"
    ]
  }
];

const drifted = [];
let synced = 0;

for (const entry of SHARED_MODULES) {
    const sourceFile = join(root, entry.source, 'src', entry.path);
    if (!existsSync(sourceFile)) {
        drifted.push(`MISSING SOURCE: ${entry.source}/src/${entry.path}`);
        continue;
    }
    const expected = readFileSync(sourceFile, 'utf8');
    for (const target of entry.targets) {
        const targetFile = join(root, target, 'src', entry.path);
        const current = existsSync(targetFile) ? readFileSync(targetFile, 'utf8') : null;
        if (current !== expected) {
            if (checkOnly) {
                drifted.push(`${target}/src/${entry.path} (differs from ${entry.source}/src/${entry.path})`);
            } else {
                mkdirSync(dirname(targetFile), {recursive: true});
                writeFileSync(targetFile, expected);
                synced++;
            }
        }
    }
}

if (checkOnly) {
    if (drifted.length) {
        console.error(`sync-web-shared: ${drifted.length} shared web file(s) drifted across portals; run \`node scripts/sync-web-shared.mjs\`:\n  ` + drifted.join('\n  '));
        process.exit(1);
    }
    console.log(`sync-web-shared: ${SHARED_MODULES.length} shared modules synchronized across web portals`);
} else {
    console.log(`sync-web-shared: synced ${synced} file(s) across ${SHARED_MODULES.length} shared modules`);
}
