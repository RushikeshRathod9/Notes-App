// JavaScript Frontend - static/app.js

class NotesApp {
    constructor() {
        this.notes = [];
        this.currentNote = null;
        this.isLoading = false;
        this.searchQuery = '';
        
        // API Base URL
        this.apiUrl = '/api';
        
        // Initialize the app
        this.init();
    }

    // Initialize the application
    async init() {
        this.bindEvents();
        await this.loadNotes();
        this.updateUI();
        console.log('Notes App initialized successfully');
    }

    // Bind event listeners
    bindEvents() {
        // New note button
        document.getElementById('newNoteBtn').addEventListener('click', () => {
            this.createNewNote();
        });

        // Save button
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveCurrentNote();
        });

        // Delete button
        document.getElementById('deleteBtn').addEventListener('click', () => {
            this.deleteCurrentNote();
        });

        // Title input changes
        document.getElementById('noteTitle').addEventListener('input', (e) => {
            this.handleTitleChange(e.target.value);
        });

        // Content textarea changes
        document.getElementById('noteContent').addEventListener('input', (e) => {
            this.handleContentChange(e.target.value);
        });

        // Search input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Auto-save on content change (debounced)
        this.setupAutoSave();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    // Setup auto-save functionality
    setupAutoSave() {
        let autoSaveTimeout;
        const autoSaveDelay = 2000; // 2 seconds

        const triggerAutoSave = () => {
            clearTimeout(autoSaveTimeout);
            autoSaveTimeout = setTimeout(() => {
                if (this.currentNote && this.hasUnsavedChanges()) {
                    this.saveCurrentNote(true); // Silent save
                }
            }, autoSaveDelay);
        };

        // Bind to title and content changes
        document.getElementById('noteTitle').addEventListener('input', triggerAutoSave);
        document.getElementById('noteContent').addEventListener('input', triggerAutoSave);
    }

    // Handle keyboard shortcuts
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + S to save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveCurrentNote();
        }

        // Ctrl/Cmd + N to create new note
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.createNewNote();
        }

        // Escape to clear search
        if (e.key === 'Escape' && document.activeElement === document.getElementById('searchInput')) {
            document.getElementById('searchInput').value = '';
            this.handleSearch('');
        }
    }

    // Load all notes from the server
    async loadNotes() {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiUrl}/notes`);
            const data = await response.json();

            if (data.success) {
                this.notes = data.data.sort((a, b) => 
                    new Date(b.updated_at) - new Date(a.updated_at)
                );
                this.renderNotesList();
                this.updateNotesCount();
            } else {
                this.showNotification('Failed to load notes', 'error');
            }
        } catch (error) {
            console.error('Error loading notes:', error);
            this.showNotification('Error loading notes', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Create a new note
    createNewNote() {
        const newNote = {
            id: null, // Will be assigned by server
            title: 'Untitled Note',
            content: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            tags: []
        };

        this.selectNote(newNote);
        document.getElementById('noteTitle').focus();
    }

    // Save the current note
    async saveCurrentNote(silent = false) {
        if (!this.currentNote) return;

        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();

        if (!title && !content) {
            if (!silent) this.showNotification('Please add a title or content', 'error');
            return;
        }

        try {
            this.showLoading(true);

            const noteData = {
                title: title || 'Untitled Note',
                content: content,
                tags: this.currentNote.tags || []
            };

            let response;
            if (this.currentNote.id) {
                // Update existing note
                response = await fetch(`${this.apiUrl}/notes/${this.currentNote.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(noteData)
                });
            } else {
                // Create new note
                response = await fetch(`${this.apiUrl}/notes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(noteData)
                });
            }

            const data = await response.json();

            if (data.success) {
                // Update the current note with server response
                this.currentNote = data.data;
                
                // Update notes array
                const existingIndex = this.notes.findIndex(note => note.id === this.currentNote.id);
                if (existingIndex !== -1) {
                    this.notes[existingIndex] = this.currentNote;
                } else {
                    this.notes.unshift(this.currentNote);
                }

                // Sort notes by updated date
                this.notes.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

                this.renderNotesList();
                this.updateNotesCount();
                this.updateNoteMetadata();

                if (!silent) {
                    this.showNotification('Note saved successfully', 'success');
                }
            } else {
                this.showNotification(data.error || 'Failed to save note', 'error');
            }
        } catch (error) {
            console.error('Error saving note:', error);
            this.showNotification('Error saving note', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Delete the current note
    async deleteCurrentNote() {
        if (!this.currentNote || !this.currentNote.id) return;

        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            this.showLoading(true);

            const response = await fetch(`${this.apiUrl}/notes/${this.currentNote.id}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                // Remove from notes array
                this.notes = this.notes.filter(note => note.id !== this.currentNote.id);
                
                this.renderNotesList();
                this.updateNotesCount();
                this.showWelcomeScreen();
                this.currentNote = null;

                this.showNotification('Note deleted successfully', 'success');
            } else {
                this.showNotification(data.error || 'Failed to delete note', 'error');
            }
        } catch (error) {
            console.error('Error deleting note:', error);
            this.showNotification('Error deleting note', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Handle search functionality
    async handleSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
        
        if (this.searchQuery === '') {
            // Show all notes
            this.renderNotesList();
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/notes/search?q=${encodeURIComponent(this.searchQuery)}`);
            const data = await response.json();

            if (data.success) {
                const filteredNotes = data.data.sort((a, b) => 
                    new Date(b.updated_at) - new Date(a.updated_at)
                );
                this.renderNotesList(filteredNotes);
            } else {
                this.showNotification('Search failed', 'error');
            }
        } catch (error) {
            console.error('Error searching notes:', error);
            // Fallback to client-side search
            this.performClientSideSearch();
        }
    }

    // Fallback client-side search
    performClientSideSearch() {
        const filteredNotes = this.notes.filter(note => 
            note.title.toLowerCase().includes(this.searchQuery) ||
            note.content.toLowerCase().includes(this.searchQuery)
        );
        this.renderNotesList(filteredNotes);
    }

    // Select and display a note
    selectNote(note) {
        this.currentNote = note;
        this.showEditorScreen();
        this.populateEditor();
        this.updateActiveNoteInList();
        this.updateWordCount();
    }

    // Handle title change
    handleTitleChange(title) {
        if (this.currentNote) {
            this.currentNote.title = title;
            this.updateActiveNoteInList();
        }
    }

    // Handle content change
    handleContentChange(content) {
        if (this.currentNote) {
            this.currentNote.content = content;
            this.updateWordCount();
        }
    }

    // Check if current note has unsaved changes
    hasUnsavedChanges() {
        if (!this.currentNote) return false;
        
        const currentTitle = document.getElementById('noteTitle').value.trim();
        const currentContent = document.getElementById('noteContent').value.trim();
        
        return currentTitle !== this.currentNote.title || 
               currentContent !== this.currentNote.content;
    }

    // Render the notes list
    renderNotesList(notesToRender = null) {
        const notesList = document.getElementById('notesList');
        const notes = notesToRender || this.notes;

        if (notes.length === 0) {
            notesList.innerHTML = `
                <div class="empty-state">
                    <p>No notes found</p>
                    ${this.searchQuery ? '<p>Try a different search term</p>' : '<p>Create your first note!</p>'}
                </div>
            `;
            return;
        }

        notesList.innerHTML = notes.map(note => `
            <div class="note-item" data-note-id="${note.id}" onclick="app.selectNoteById('${note.id}')">
                <div class="note-item-header">
                    <h4 class="note-item-title">${this.escapeHtml(note.title)}</h4>
                    <span class="note-item-date">${this.formatDate(note.updated_at)}</span>
                </div>
                <p class="note-item-preview">${this.escapeHtml(this.getPreview(note.content))}</p>
            </div>
        `).join('');
    }

    // Select note by ID
    selectNoteById(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (note) {
            this.selectNote(note);
        }
    }

    // Update active note styling in list
    updateActiveNoteInList() {
        const noteItems = document.querySelectorAll('.note-item');
        noteItems.forEach(item => {
            item.classList.remove('active');
            if (this.currentNote && item.dataset.noteId === this.currentNote.id) {
                item.classList.add('active');
            }
        });
    }

    // Populate editor with current note data
    populateEditor() {
        if (!this.currentNote) return;

        document.getElementById('noteTitle').value = this.currentNote.title || '';
        document.getElementById('noteContent').value = this.currentNote.content || '';
        
        this.updateNoteMetadata();
    }

    // Update note metadata display
    updateNoteMetadata() {
        if (!this.currentNote) return;

        const createdAt = document.getElementById('createdAt');
        const updatedAt = document.getElementById('updatedAt');

        if (this.currentNote.created_at) {
            createdAt.textContent = `Created: ${this.formatDate(this.currentNote.created_at)}`;
        }

        if (this.currentNote.updated_at) {
            updatedAt.textContent = `Updated: ${this.formatDate(this.currentNote.updated_at)}`;
        }
    }

    // Update word count
    updateWordCount() {
        const content = document.getElementById('noteContent').value;
        const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
        document.getElementById('wordCount').textContent = `${wordCount} words`;
    }

    // Update notes count display
    updateNotesCount() {
        document.getElementById('notesCount').textContent = this.notes.length;
    }

    // Show welcome screen
    showWelcomeScreen() {
        document.getElementById('welcomeScreen').style.display = 'flex';
        document.getElementById('editorScreen').style.display = 'none';
    }

    // Show editor screen
    showEditorScreen() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('editorScreen').style.display = 'flex';
    }

    // Update UI based on current state
    updateUI() {
        if (this.currentNote) {
            this.showEditorScreen();
            this.populateEditor();
            this.updateActiveNoteInList();
        } else {
            this.showWelcomeScreen();
        }
    }

    // Show/hide loading overlay
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = show ? 'flex' : 'none';
        this.isLoading = show;
    }

    // Show notification
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        container.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Utility function to escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Get preview text from content
    getPreview(content, maxLength = 100) {
        if (!content) return 'No content';
        return content.length > maxLength ? 
            content.substring(0, maxLength) + '...' : 
            content;
    }

    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return 'Today';
        } else if (diffDays === 2) {
            return 'Yesterday';
        } else if (diffDays <= 7) {
            return `${diffDays - 1} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NotesApp();
});

// Add some additional CSS for empty state
const additionalCSS = `
    .empty-state {
        text-align: center;
        padding: 2rem;
        color: #718096;
    }
    
    .empty-state p {
        margin: 0.5rem 0;
    }
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);