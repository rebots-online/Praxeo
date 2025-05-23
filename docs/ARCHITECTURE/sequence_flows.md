# Sequence Flows

## 1. Input Processing Flow

### 1.1 YouTube URL Processing
```mermaid
sequenceDiagram
    participant User
    participant UI as UI Components
    participant Validator as Input Validator
    participant YouTube as YouTube API
    
    User->>UI: Enters YouTube URL
    UI->>Validator: Validate input
    Validator->>YouTube: Check video availability
    YouTube-->>Validator: Validation result
    
    alt Valid URL
        Validator-->>UI: Validation success
        UI->>UI: Enable generate button
    else Invalid URL
        Validator-->>UI: Show validation error
    end
```

### 1.2 PDF/Text Upload
```mermaid
sequenceDiagram
    participant User
    participant UI as FileUploader
    participant Parser as Document Parser
    
    User->>UI: Uploads PDF/Text file
    UI->>Parser: Process document
    Parser->>Parser: Extract text content
    Parser-->>UI: Extracted text
    UI->>UI: Update preview
```

### 1.3 Topic-based Generation
```mermaid
sequenceDiagram
    participant User
    participant UI as TopicInput
    participant Agent as WebSearchAgent
    participant LLM as Gemini API
    
    User->>UI: Enters topic
    UI->>Agent: Search for relevant content
    Agent->>LLM: Generate search queries
    LLM-->>Agent: Generated queries
    Agent->>Web: Execute searches
    Web-->>Agent: Search results
    Agent->>LLM: Synthesize content
    LLM-->>Agent: Generated content
    Agent-->>UI: Structured content
    UI->>UI: Update preview
```

## 2. Embedding Generation Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as EmbedController
    participant API as EmbedAPI
    
    User->>UI: Clicks "Embed"
    UI->>UI: Show embed options
    User->>UI: Configures embed settings
    UI->>API: Generate embed code
    API-->>UI: Return iframe code
    UI->>User: Show embed code & preview
    
    alt User copies code
        User->>UI: Copies embed code
        UI-->>User: Show success message
    end
```

## 2. Example Selection Flow

```mermaid
sequenceDiagram
    participant User
    participant Gallery as ExampleGallery
    participant App
    participant Content
    
    User->>Gallery: Selects example
    Gallery->>App: Notify selection
    App->>Content: Load example data
    Content->>Content: Parse spec & code
    Content-->>User: Display example
```

## 3. Content Generation Flow

```mermaid
sequenceDiagram
    participant User
    participant Content
    participant Gemini
    
    User->>Content: Clicks "Generate"
    Content->>Gemini: Send prompt with video context
    Gemini-->>Content: Return generated content
    Content->>Content: Parse response
    Content-->>User: Update UI with results
    
    loop Auto-save (if implemented)
        Content->>LocalStorage: Save state
    end
```

## 4. Error Handling Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant API
    
    User->>App: Performs action
    App->>API: Make request
    
    alt Success
        API-->>App: Return data
        App-->>User: Update UI
    else Rate Limited
        API-->>App: 429 Too Many Requests
        App-->>User: Show rate limit message
    else Network Error
        API--xApp: Connection failed
        App-->>User: Show network error
        App->>App: Queue for retry
    end
```

## 5. Editor State Management

```mermaid
sequenceDiagram
    participant User
    participant Editor as CodeEditor
    participant State as App State
    participant Preview
    
    User->>Editor: Edits code
    Editor->>State: Update code content
    State->>Preview: Trigger update
    Preview->>Preview: Validate code
    
    alt Code is valid
        Preview-->>User: Show updated preview
    else Code has errors
        Preview-->>User: Show error markers
    end
```

## Key Interactions

1. **Video Processing**
   - URL validation
   - Video metadata extraction
   - Content generation

2. **User Interface**
   - Example selection
   - Editor interactions
   - Preview updates

3. **State Management**
   - Form state
   - Editor state
   - API state

4. **Error Handling**
   - Validation errors
   - API errors
   - Network issues
   - Content generation failures
