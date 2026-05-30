# Requirements Document

## Introduction

NexusServer is a commercial IMEI/Server unlock platform built with Next.js 15, designed to be sold to businesses who run their own unlock services. This feature adds a licensing mechanism and a "System & Update" admin menu that allows licensed installations to receive and apply software updates with a single click. Unlicensed installations are blocked from updating.

## Glossary

- **License_Server**: The remote server operated by the NexusServer vendor that validates license keys and serves update packages.
- **License_Key**: A unique string issued to a customer upon purchase, used to authenticate the installation against the License_Server.
- **Installation**: A deployed instance of NexusServer running on a customer's infrastructure.
- **Update_Manager**: The backend module within NexusServer responsible for checking, downloading, and applying updates.
- **System_Page**: The admin dashboard page at `/admin/system` that displays license status, system information, and update controls.
- **Admin**: A user with the ADMIN role who has full access to all features.
- **Sub_Admin**: A user with the SUB_ADMIN role whose access is governed by the permission system.

## Requirements

### Requirement 1: License Key Storage and Activation

**User Story:** As an admin, I want to enter and activate my license key in the admin panel, so that my installation is recognized as licensed.

#### Acceptance Criteria

1. IF no license is currently activated, THEN THE System_Page SHALL display a license key input field that accepts a string of up to 128 characters.
2. WHEN the admin submits a license key, THE Update_Manager SHALL send the key along with the Installation domain to the License_Server for validation within a timeout of 30 seconds.
3. WHEN the License_Server responds with a valid confirmation, THE Update_Manager SHALL store the license key, activation status, and license expiration date in the SiteSettings record.
4. IF the License_Server responds with an invalid or expired status, THEN THE System_Page SHALL display the error message returned by the License_Server and retain the license key input field for correction.
5. IF the network connection to the License_Server fails or the 30-second timeout is exceeded, THEN THE System_Page SHALL display a connection error message and retain the previous license state.
6. WHILE the license status is active, THE System_Page SHALL display the stored license key in a masked format and provide an option to replace it with a new key.

### Requirement 2: License Validation on Startup

**User Story:** As the platform vendor, I want each installation to periodically validate its license, so that revoked or expired licenses are detected.

#### Acceptance Criteria

1. WHEN the NexusServer application starts, THE Update_Manager SHALL attempt to validate the stored license key against the License_Server within 30 seconds.
2. WHEN the License_Server confirms the license is valid, THE Update_Manager SHALL update the local license status to active with the latest expiration date.
3. WHEN the License_Server reports the license as expired or revoked, THE Update_Manager SHALL update the local license status to inactive and record the reason provided by the License_Server.
4. IF the License_Server is unreachable during startup validation (no successful response within 30 seconds), THEN THE Update_Manager SHALL retain the last known license status and log a warning, provided the last successful validation occurred within 7 days.
5. IF the License_Server has been unreachable for more than 7 consecutive days since the last successful validation, THEN THE Update_Manager SHALL update the local license status to inactive with reason "grace period exceeded".
6. IF no license key is stored locally when the NexusServer application starts, THEN THE Update_Manager SHALL set the local license status to inactive and log an error indicating a missing license key.
7. WHILE the NexusServer application is running, THE Update_Manager SHALL re-validate the license against the License_Server every 24 hours following the same validation rules as startup.

### Requirement 3: Update Availability Check

**User Story:** As an admin, I want to see whether a new update is available, so that I know when to update my installation.

#### Acceptance Criteria

1. WHILE the license status is active, THE System_Page SHALL display a "Check for Updates" button.
2. WHEN the admin clicks "Check for Updates", THE Update_Manager SHALL query the License_Server for the latest available version and THE System_Page SHALL display a loading indicator on the button until a response is received or 30 seconds have elapsed.
3. WHEN the License_Server responds with a version number greater than the current Installation version, THE System_Page SHALL display the new version number, a release notes summary truncated to a maximum of 500 characters with a "read more" link if longer, and an "Update Now" button.
4. WHEN the License_Server responds with a version number equal to the current Installation version, THE System_Page SHALL display a message indicating the system is up to date along with the current version number.
5. IF the License_Server is unreachable or does not respond within 30 seconds during an update check, THEN THE System_Page SHALL display an error message indicating the check failed and retain the "Check for Updates" button in its enabled state for retry.
6. WHILE the license status is inactive, THE System_Page SHALL disable the "Check for Updates" button and display a message stating that a valid license is required to receive updates.

### Requirement 4: One-Click Update Execution

**User Story:** As an admin, I want to update my installation with a single click, so that I can apply updates without technical knowledge.

#### Acceptance Criteria

1. WHEN the admin clicks "Update Now", THE Update_Manager SHALL initiate a download of the update package from the License_Server with a timeout of 300 seconds.
2. WHILE the update is downloading, THE System_Page SHALL display a progress indicator showing the percentage of bytes downloaded and the total file size.
3. WHEN the download completes successfully, THE Update_Manager SHALL apply the update files to the Installation within 120 seconds.
4. WHEN the update is applied successfully, THE System_Page SHALL display a success message with the new version number and prompt the admin to restart the application.
5. IF the download fails, is interrupted, or exceeds the 300-second timeout, THEN THE Update_Manager SHALL discard the partial download, display an error message indicating the failure reason, and offer a retry option limited to a maximum of 3 attempts.
6. IF the update application fails or exceeds the 120-second timeout, THEN THE Update_Manager SHALL restore all modified files to their pre-update state, display an error message indicating which step failed, and re-enable the "Update Now" button.
7. WHILE an update is in progress, THE System_Page SHALL disable all update-related buttons to prevent concurrent update attempts.
8. IF the maximum retry attempts are exhausted, THEN THE Update_Manager SHALL display an error message instructing the admin to check network connectivity or contact support, and re-enable the "Update Now" button.

### Requirement 5: System Information Display

**User Story:** As an admin, I want to see my current system version and license details at a glance, so that I can monitor the health of my installation.

#### Acceptance Criteria

1. THE System_Page SHALL display the current NexusServer version number in semantic versioning format (MAJOR.MINOR.PATCH).
2. THE System_Page SHALL display the license status as one of the following values: "active", "inactive", or "not activated".
3. WHILE the license status is "active", THE System_Page SHALL display the license expiration date in the format YYYY-MM-DD.
4. THE System_Page SHALL display the installation domain (fully qualified domain name) that the license is bound to.
5. THE System_Page SHALL display the date and time of the last successful system update in the format YYYY-MM-DD HH:mm (server local time).
6. IF the last successful system update has never occurred, THEN THE System_Page SHALL display an indication that no update has been recorded.
7. IF the license status is "inactive" or "not activated", THEN THE System_Page SHALL hide the license expiration date and display an indication that the license requires activation or renewal.

### Requirement 6: Permission Control for System Page

**User Story:** As an admin, I want to restrict access to the System & Update page, so that only authorized personnel can manage licensing and updates.

#### Acceptance Criteria

1. THE System_Page SHALL be accessible only to users with the ADMIN role or SUB_ADMIN users who have the `manageSystem` permission set to true in their SubAdminPermission record.
2. IF a SUB_ADMIN user without the `manageSystem` permission navigates to `/admin/system`, THEN THE System_Page SHALL redirect the user to `/admin/no-access` before rendering any page content.
3. THE Sidebar SHALL display the "System & Update" menu item only to users who have the ADMIN role or SUB_ADMIN users with the `manageSystem` permission set to true; for all other users the menu item SHALL be hidden (not rendered in the DOM).
4. IF an unauthenticated user or a user with the USER role attempts to access `/admin/system`, THEN THE System_Page SHALL redirect to the login page or the user dashboard respectively, consistent with the existing admin layout guard.

### Requirement 7: Update History Log

**User Story:** As an admin, I want to see a history of past updates, so that I can track what changes have been applied to my installation.

#### Acceptance Criteria

1. THE System_Page SHALL display a list of previously applied updates in reverse chronological order, showing a maximum of 20 entries per page with pagination controls when more entries exist.
2. FOR EACH update entry in the list, THE System_Page SHALL display the version number applied, the previous version number, the date and time the update was applied, and the status (success or failed).
3. WHEN the admin selects a failed update entry, THE System_Page SHALL display the error description that was recorded during the update failure.
4. IF no updates have been applied, THEN THE System_Page SHALL display a message indicating no update history is available.
5. WHEN the admin navigates to a subsequent page of the update history, THE System_Page SHALL load and display the next set of 20 entries in reverse chronological order.

### Requirement 8: License Deactivation

**User Story:** As an admin, I want to deactivate my license from the current installation, so that I can transfer it to a different server.

#### Acceptance Criteria

1. WHILE the license status is active, THE System_Page SHALL display a "Deactivate License" button.
2. WHEN the admin clicks "Deactivate License", THE System_Page SHALL display a confirmation dialog warning that updates will no longer be available, with options to confirm or cancel.
3. IF the admin cancels the confirmation dialog, THEN THE System_Page SHALL close the dialog and retain the current license state unchanged.
4. WHEN the admin confirms deactivation, THE Update_Manager SHALL send a deactivation request to the License_Server within 10 seconds, and only upon successful acknowledgment, remove the license data from the local SiteSettings.
5. WHEN the license data is successfully removed from SiteSettings, THE System_Page SHALL update the license status display to inactive and hide the "Deactivate License" button.
6. IF the License_Server does not respond within 10 seconds or returns an error during deactivation, THEN THE Update_Manager SHALL display an error message indicating the deactivation failed and retain the current license state without modifying local SiteSettings.
