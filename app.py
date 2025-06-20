# app.py - Flask Backend for Notes App
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import json
import os
from datetime import datetime
import uuid

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend-backend communication

# Data storage file
NOTES_FILE = 'notes_data.json'

def load_notes():
    """Load notes from JSON file"""
    if os.path.exists(NOTES_FILE):
        try:
            with open(NOTES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    return []

def save_notes(notes):
    """Save notes to JSON file"""
    try:
        with open(NOTES_FILE, 'w', encoding='utf-8') as f:
            json.dump(notes, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"Error saving notes: {e}")
        return False

# API Routes
@app.route('/')
def index():
    """Serve the main HTML page"""
    return render_template('index.html')

@app.route('/api/notes', methods=['GET'])
def get_notes():
    """Get all notes"""
    try:
        notes = load_notes()
        return jsonify({
            'success': True,
            'data': notes
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/notes', methods=['POST'])
def create_note():
    """Create a new note"""
    try:
        data = request.get_json()
        
        if not data or 'title' not in data or 'content' not in data:
            return jsonify({
                'success': False,
                'error': 'Title and content are required'
            }), 400
        
        notes = load_notes()
        
        new_note = {
            'id': str(uuid.uuid4()),
            'title': data['title'].strip(),
            'content': data['content'].strip(),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'tags': data.get('tags', [])
        }
        
        notes.append(new_note)
        
        if save_notes(notes):
            return jsonify({
                'success': True,
                'data': new_note
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to save note'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/notes/<note_id>', methods=['PUT'])
def update_note(note_id):
    """Update an existing note"""
    try:
        data = request.get_json()
        notes = load_notes()
        
        note_index = next((i for i, note in enumerate(notes) if note['id'] == note_id), None)
        
        if note_index is None:
            return jsonify({
                'success': False,
                'error': 'Note not found'
            }), 404
        
        # Update note fields
        if 'title' in data:
            notes[note_index]['title'] = data['title'].strip()
        if 'content' in data:
            notes[note_index]['content'] = data['content'].strip()
        if 'tags' in data:
            notes[note_index]['tags'] = data['tags']
        
        notes[note_index]['updated_at'] = datetime.now().isoformat()
        
        if save_notes(notes):
            return jsonify({
                'success': True,
                'data': notes[note_index]
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to update note'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/notes/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    """Delete a note"""
    try:
        notes = load_notes()
        
        note_index = next((i for i, note in enumerate(notes) if note['id'] == note_id), None)
        
        if note_index is None:
            return jsonify({
                'success': False,
                'error': 'Note not found'
            }), 404
        
        deleted_note = notes.pop(note_index)
        
        if save_notes(notes):
            return jsonify({
                'success': True,
                'data': deleted_note
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to delete note'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/notes/search', methods=['GET'])
def search_notes():
    """Search notes by title or content"""
    try:
        query = request.args.get('q', '').lower()
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Search query is required'
            }), 400
        
        notes = load_notes()
        
        # Filter notes that contain the query in title or content
        filtered_notes = [
            note for note in notes
            if query in note['title'].lower() or query in note['content'].lower()
        ]
        
        return jsonify({
            'success': True,
            'data': filtered_notes
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Create templates directory if it doesn't exist
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static', exist_ok=True)
    
    print("Starting Notes App Server...")
    print("Access the app at: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)