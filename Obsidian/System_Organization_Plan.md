# World-Class System File Organization Plan

## Executive Summary

This plan modernizes storage, workspace layout, and knowledge capture so GoblinOS can introduce the new guild charter without tripping over disk chaos. We align physical storage tiers, VS Code workspaces, and Obsidian vaults with the Overmind hierarchy: Overmind at the top, then guild directories, scripts, and telemetry. Goal: free space, keep latency low, and give every goblin a predictable home.

## Current System Analysis

### Storage Overview
- **Main SSD (94GB)**: 97% utilized (74GB used, 2.4GB available)
- **iCloud Drive**: 593MB used
- **USB Drive (Fuaad, 32GB)**: 40% utilized (12GB used, 18GB available)

### Major Space Consumers
1. **Docker Containers**: 10GB (Library/Containers/com.docker.docker)
2. **Steam Games**: 4.5GB (Local_Storage/System/Library_Backup)
3. **Ollama Models**: 3.6GB (~/.ollama/models)
4. **System Library**: 18GB total in ~/Library
5. **User Documents**: 1.9GB
6. **Desktop Screenshots**: ~4GB (estimated)

### Existing Organization Structure
- **iCloud Drive**: Basic folders (Desktop, Documents, Downloads) + Storage_Hierarchy (App_Data, Caches, Configs, Documents)
- **USB Drive**: Multiple backup folders + Storage_Hierarchy (Archives, Backups, Containers, Games, Media)
- **ForgeMonorepo**: Flat repo roots without guild-level segmentation; goblins.yaml missing

## Strategic Reorganization Plan

### 1. Hierarchical Storage Strategy

#### Tier 1: Local SSD (Active/Performance Critical)
- Operating system and core applications
- Active development workspace (ForgeMonorepo)
- Small caches and temporary files
- System configurations

#### Tier 2: iCloud Drive (Sync/Accessibility)
- Personal documents and notes
- Application configurations
- Small media files (<100MB)
- Critical backups and archives

#### Tier 3: USB External (Archive/Large Files)
- Large media files and archives
- Game installations and data
- Container images and volumes
- System backups and snapshots
- Development archives

### 2. Enhanced Folder Structure

### Guild-Aware Workspace Layout

#### iCloud Drive Storage_Hierarchy/
```
Storage_Hierarchy/
├── Documents/
│   ├── Personal/
│   ├── Work/
│   ├── Academic/
│   └── Legal/
├── Configs/
│   ├── App_Preferences/
│   ├── System_Settings/
│   └── Development/
│       ├── GoblinOS_Guilds/
│       │   ├── goblins.yaml            # Canon charter copy for sync
│       │   ├── telemetry_playbooks/
│       │   └── pr_gate_specs/
│       └── ForgeTM/
├── App_Data/
│   ├── Browser_Data/
│   ├── Email/
│   └── Productivity/
├── Caches/
│   ├── App_Caches/
│   └── Temp_Files/
└── Backups/
    ├── Config_Backups/
    └── Critical_Files/
```

#### USB Drive Storage_Hierarchy/
```
Storage_Hierarchy/
├── Archives/
│   ├── Old_Projects/
│   ├── Completed_Work/
│   └── Historical_Data/
├── Backups/
│   ├── System_Backups/
│   ├── App_Backups/
│   └── Data_Backups/
├── Containers/
│   ├── Docker_Volumes/
│   ├── VM_Images/
│   └── Dev_Environments/
├── Games/
│   ├── Steam_Library/
│   ├── Game_Saves/
│   └── Mods/
├── Media/
│   ├── Photos/
│   ├── Videos/
│   ├── Music/
│   └── Large_Files/
└── Development/
    ├── Build_Artifacts/
    ├── Dependencies/
    ├── Archives/
    └── GoblinOS_Telemetry/
        ├── router_audit_replays/
        ├── sbom_snapshots/
        └── anomaly_training_sets/
```

#### System Folder Optimization
- **~/Library/Caches/**: Move large caches to USB
- **~/Library/Containers/**: Move Docker data to USB
- **~/.ollama/models/**: Move to USB
- **Desktop/**: Clean screenshots, organize by date
- **Documents/**: Sync to iCloud, organize subfolders

### 3. Space Optimization Actions

#### Immediate Actions (Free ~20GB)
1. **Move Docker Data**: Relocate Docker containers to USB
2. **Move Ollama Models**: Transfer AI models to external storage
3. **Move Steam Library**: Migrate games to USB
4. **Clean Desktop**: Archive old screenshots
5. **Clear System Caches**: Remove unnecessary cache files

#### Long-term Optimization
1. **Automated Cleanup**: Set up cron jobs for cache management
2. **Storage Monitoring**: Implement alerts for low space
3. **Backup Rotation**: Regular backup cleanup and rotation
4. **Compression**: Use compression for archives

### 4. VSCode Configuration Updates

#### Workspace Settings (.vscode/settings.json)
```json
{
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.pnpm/**": true,
    "**/Storage_Hierarchy/**": true,
    "**/USB_Mount/**": true,
    "**/.obsidian/**": true
  },
  "search.exclude": {
    "**/node_modules/**": true,
    "**/.pnpm/**": true,
    "**/Storage_Hierarchy/**": true,
    "**/USB_Backups/**": true,
    "**/.obsidian/**": true
  },
  "files.exclude": {
    "**/Storage_Hierarchy/**": false,
    "**/.ollama/**": true
  },
  "git.ignoreLimitWarning": true,
  "chat.overmind.goblinsConfig": "${workspaceFolder:ForgeMonorepo}/goblins.yaml"
}
```

#### User Settings (User/settings.json)
```json
{
  "files.defaultLanguage": "typescript",
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "workbench.editor.enablePreview": false,
  "explorer.sortOrder": "type",
  "search.followSymlinks": false
}
```

### 5. System Settings Configuration

#### macOS System Preferences
1. **Desktop & Documents Sync**: Ensure iCloud sync is enabled
2. **Storage Management**: Enable Optimize Mac Storage
3. **Default Save Locations**: Configure apps to save to appropriate locations

#### Terminal Commands for Configuration
```bash
# Create symlinks for large directories
ln -s /Volumes/Fuaad/Storage_Hierarchy/Containers ~/Library/Containers_Linked
ln -s /Volumes/Fuaad/Storage_Hierarchy/Games/Steam ~/.steam_linked

# Set default download location (if possible)
defaults write com.apple.Safari DownloadsPath "~/Downloads"
```

### 6. Implementation Phases

#### Phase 1: Foundation (Immediate)
- Create enhanced folder structures
- Move large files to appropriate tiers
- Set up basic symlinks and configurations

#### Phase 2: Optimization (Week 1)
- Implement automated cleanup scripts
- Configure VSCode settings
- Update system preferences

#### Phase 3: Automation (Ongoing)
- Set up monitoring and alerts
- Create backup rotation policies
- Implement storage optimization scripts

### 7. Risk Mitigation

#### Safety Measures
- **No Data Deletion**: Only move/organize, never delete
- **Backup First**: Create backups before major moves
- **Test Access**: Verify file accessibility after moves
- **Workspace Protection**: Ensure ForgeMonorepo remains untouched

#### Recovery Plan
- **USB Failure**: iCloud backups available
- **iCloud Issues**: Local copies on USB
- **System Issues**: Bootable backups on USB

### 8. Monitoring and Maintenance

#### Key Metrics
- Storage utilization by tier
- File access patterns
- Backup success rates
- Performance impact

#### Maintenance Tasks
- Weekly storage review
- Monthly backup verification
- Quarterly structure optimization
- Annual archive cleanup

## Expected Outcomes

- **Space Efficiency**: Free 20+ GB on main SSD
- **Performance**: Faster system with optimized storage tiers
- **Organization**: Logical file hierarchy across all storage
- **Accessibility**: Files available where and when needed
- **Safety**: Redundant backups and no data loss

## Implementation Timeline

- **Day 1**: Analysis complete, plan finalized
- **Day 1-2**: Folder structure creation and initial moves
- **Day 3**: Configuration updates and testing
- **Ongoing**: Monitoring and optimization

## Implementation Status

### Completed Tasks ✅
- **System Analysis**: Complete storage analysis (SSD 94%, iCloud 593MB, USB 40%)
- **Folder Structures**: Created Storage_Hierarchy on iCloud and USB drives
- **Screenshot Organization**: Moved Desktop screenshots to iCloud/Storage_Hierarchy/Media/Screenshots/
- **VSCode Configuration**: Updated .vscode/settings.json with performance optimizations and exclusions
- **Ollama Models**: Moved 3.6GB models to USB, created symlink (functional)
- **Steam Library**: Moved 4.5GB library to USB, created symlink (functional)
- **System Settings**: Updated macOS defaults for document saving and iCloud optimization

### Partially Complete Tasks 🟡
- **Docker Data**: Attempted move of 9.8GB but failed due to USB space (20GB available vs 9.8GB needed + fragmentation)

### Pending Tasks ⏳
- **Docker Relocation**: Find alternative solution (selective move, compression, or different storage)
- **VSCode Restart**: Restart VSCode to apply new settings
- **Final Verification**: Confirm all symlinks functional and space freed
- **Monitoring Setup**: Implement storage monitoring scripts

### Space Freed
- **Current SSD Usage**: 94% (70GB used) - freed ~4GB from Ollama/Steam moves
- **Target**: Free additional 10GB+ with Docker relocation

### Issues Encountered
- **USB Space Constraints**: 32GB drive nearly full after Steam move (2GB available)
- **Docker Complexity**: Large monolithic data structure, difficult to split
- **Symlink Functionality**: Confirmed working for Ollama and Steam
