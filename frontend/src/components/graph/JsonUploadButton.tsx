import React, { useRef } from 'react';
import { UploadCloud } from 'lucide-react';

interface JsonUploadButtonProps {
  onJsonUploaded: (jsonData: any, fileName?: string) => void; // Añadir fileName opcional
}

const JsonUploadButton: React.FC<JsonUploadButtonProps> = ({ onJsonUploaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          onJsonUploaded(json, file.name); // Pasar file.name
        } catch (error) {
          console.error("Error parsing JSON:", error);
          alert("Failed to parse JSON file. Please ensure it's valid JSON.");
        }
      };
      reader.readAsText(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-accent-cyan', 'bg-gray-700');
    const file = event.dataTransfer.files?.[0];
    if (file && file.type === "application/json") {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                onJsonUploaded(json, file.name); // Pasar file.name
            } catch (error) {
                console.error("Error parsing JSON:", error);
                alert("Failed to parse JSON file. Please ensure it's valid JSON.");
            }
        };
        reader.readAsText(file);
    } else if (file) {
        alert("Please drop a valid JSON file.");
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('border-accent-cyan', 'bg-gray-700');
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-accent-cyan', 'bg-gray-700');
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-accent-cyan transition-colors duration-200"
      onClick={handleButtonClick}
    >
      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <UploadCloud size={48} className="mx-auto mb-4 text-gray-500" />
      <p className="text-text-secondary">
        Drag & drop your JSON file here, or{' '}
        <span className="text-accent-cyan font-semibold">click to browse</span>.
      </p>
    </div>
  );
};

export default JsonUploadButton;
