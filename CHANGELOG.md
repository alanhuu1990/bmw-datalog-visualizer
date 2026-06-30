# Changelog

All notable changes to CSV Visualizer are documented here.
Version numbers follow semver and stay in sync with package.json.

## [Unreleased]

### Added

- Session persistence: last uploaded CSV/GPX files and playback UI state (selected columns, GPS sync mode, offset) restore after page refresh via IndexedDB
- Clear (×) buttons remove persisted files; demo datalog loads only when no saved session exists

## [0.4.0] - 2026-06-30

### Added

- In-app changelog page at `/changelog` with version display
- CHANGELOG button in the top-right header next to CONFIG

## [0.3.0] - 2026-06-30

### Added

- Settings page (`/settings`) with max gauge bars and page layout options
- Three layout modes: classic, map+gauge sidebar, fixed map + scrollable content
- GaugePanel component and VisualizerSettingsContext (localStorage persistence)

## [0.2.0] - 2026-06-30

### Added

- GPX map playback synced with datalog charts
- GPS sync controls (end/manual offset modes)

## [0.1.0] - 2026-06-18

### Added

- Initial Bootmod3 / BimmerLink CSV thermal playback visualizer
- Phase auto-detection, live gauges, demo datalog on first load
