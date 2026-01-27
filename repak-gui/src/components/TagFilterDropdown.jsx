import React, { useState, useEffect, useRef } from 'react';
import './TagFilterDropdown.css';

const TagFilterDropdown = ({ tags, selectedTag, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleToggle = () => setIsOpen(!isOpen);

    const handleSelect = (tag) => {
        onSelect(tag);
        setIsOpen(false);
    };

    return (
        <div className="tag-filter-container" ref={dropdownRef}>
            <button
                className={`tag-filter-trigger ${isOpen ? 'open' : ''} ${selectedTag ? 'active' : ''}`}
                onClick={handleToggle}
                title={selectedTag || "All Tags"}
            >
                {selectedTag || "All Tags"}
            </button>

            {isOpen && (
                <div className="tag-filter-dropdown">
                    <div
                        className={`tag-filter-item ${!selectedTag ? 'selected' : ''}`}
                        onClick={() => handleSelect('')}
                    >
                        All Tags
                    </div>
                    {tags && tags.length > 0 && <div className="tag-filter-separator" />}
                    {tags && tags.map(tag => (
                        <div
                            key={tag}
                            className={`tag-filter-item ${selectedTag === tag ? 'selected' : ''}`}
                            onClick={() => handleSelect(tag)}
                            title={tag}
                        >
                            {tag}
                        </div>
                    ))}
                    {(!tags || tags.length === 0) && (
                        <div className="tag-filter-item disabled" style={{ cursor: 'default', opacity: 0.5 }}>
                            No tags found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TagFilterDropdown;
