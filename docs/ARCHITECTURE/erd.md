# Entity Relationship Diagram

## Data Model

```mermaid
erDiagram
    %% Core Entities
    PROJECT ||--o{ EXAMPLE : contains
    EXAMPLE ||--o{ CODE_SNIPPET : has
    EXAMPLE ||--o{ SPEC : has
    EXAMPLE ||--o{ EMBED : generates
    
    %% Input Types (Inheritance)
    EXAMPLE ||--|> YOUTUBE_INPUT : supports
    EXAMPLE ||--|> DOCUMENT_INPUT : supports
    EXAMPLE ||--|> TOPIC_INPUT : supports
    
    PROJECT {
        string id PK
        string title
        string description
        string ownerId FK
        timestamp createdAt
        timestamp updatedAt
        string[] tags
        string status
    }
    
    EXAMPLE {
        string id PK
        string projectId FK
        string title
        string description
        string inputType
        string status
        timestamp createdAt
        timestamp updatedAt
    }
    
    CODE_SNIPPET {
        string id PK
        string exampleId FK
        string language
        string content
        boolean isPrimary
        timestamp createdAt
    }
    
    SPEC {
        string id PK
        string exampleId FK
        string content
        string format
        string version
        timestamp createdAt
    }
    
    EMBED {
        string id PK
        string exampleId FK
        string embedCode
        object config
        timestamp createdAt
        timestamp expiresAt
    }
    
    YOUTUBE_INPUT {
        string id PK
        string exampleId FK
        string videoUrl
        string videoId
        string title
        string thumbnailUrl
    }
    
    DOCUMENT_INPUT {
        string id PK
        string exampleId FK
        string fileUrl
        string fileName
        string fileType
        string extractedText
    }
    
    TOPIC_INPUT {
        string id PK
        string exampleId FK
        string topic
        string[] searchQueries
        string[] sources
        string generatedContent
    }
    
    SETTINGS {
        string id PK
        string userId FK
        object editorConfig
        object embedConfig
        timestamp updatedAt
    }
```

## Entity Descriptions

### Example
Represents a pre-configured example with associated code and specifications.

**Fields:**
- `id`: Unique identifier (UUID)
- `title`: Human-readable title
- `description`: Detailed description
- `youtubeUrl`: Source YouTube video URL
- `tags`: Categorization tags
- `createdAt`: Creation timestamp

### CodeSnippet
Represents a code snippet associated with an example.

**Fields:**
- `id`: Unique identifier (UUID)
- `exampleId`: Reference to parent example
- `language`: Programming language (e.g., 'javascript', 'python')
- `content`: Source code content
- `isPrimary`: Whether this is the primary snippet

### Spec
Represents a specification document for an example.

**Fields:**
- `id`: Unique identifier (UUID)
- `exampleId`: Reference to parent example
- `content`: Specification content
- `format`: Specification format (e.g., 'markdown', 'yaml')

### Settings
Stores user preferences and configuration.

**Fields:**
- `id`: Unique identifier (UUID)
- `apiKey`: Gemini API key
- `theme`: UI theme preference
- `editorConfig`: Editor configuration (tabs, font size, etc.)
- `updatedAt`: Last modified timestamp

## Relationships

1. **Example to CodeSnippet (One-to-Many)**
   - One example can have multiple code snippets
   - Each code snippet belongs to exactly one example

2. **Example to Spec (One-to-One)**
   - Each example has exactly one specification
   - Each specification belongs to exactly one example

3. **Settings (Singleton)**
   - Only one settings record exists in the system
   - Accessed globally for configuration

## Data Access Patterns

1. **Example Retrieval**
   - Fetch example by ID with all related data
   - List examples filtered by tags
   - Search examples by title/description

2. **Code Management**
   - Get primary code snippet for an example
   - List all code snippets for an example
   - Update code content

3. **Settings Management**
   - Load settings on app start
   - Update settings atomically
   - Validate settings before saving
