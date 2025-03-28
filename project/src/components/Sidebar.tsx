import React from 'react';
import { Upload, FileText } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface SidebarProps {
  selectedLanguage: string;
  currentBotId?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedLanguage, currentBotId }) => {
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    onDrop: (acceptedFiles) => {
      console.log('Files dropped:', acceptedFiles);
    }
  });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">Documents</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Upload and manage your documents
        </p>
      </div>

      <div className="p-4">
        <div
          {...getRootProps()}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto text-gray-400" />
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Drag & drop files here, or click to select
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {/* Placeholder for document list */}
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <div>
              <p className="font-medium">Example Document</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">PDF • 2.4 MB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;