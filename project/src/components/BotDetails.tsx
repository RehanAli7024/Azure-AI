import React, { useState } from 'react';
import { ArrowLeft, Save, Trash2, Play, PlusCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface BotDetailsProps {
  bot: any;
  onBotUpdated: (bot: any) => void;
  onBack: () => void;
  onStartChat: () => void;
}

const BotDetails: React.FC<BotDetailsProps> = ({
  bot,
  onBotUpdated,
  onBack,
  onStartChat
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBot, setEditedBot] = useState(bot);
  const [documents, setDocuments] = useState(bot.documents || []);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    onDrop: (acceptedFiles) => {
      const newDocuments = acceptedFiles.map(file => ({
        id: Date.now().toString(),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadDate: new Date().toISOString()
      }));
      setDocuments([...documents, ...newDocuments]);
    }
  });

  const handleSave = () => {
    onBotUpdated({ ...editedBot, documents });
    setIsEditing(false);
  };

  const removeDocument = (documentId: string) => {
    setDocuments(documents.filter(doc => doc.id !== documentId));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Bots
        </button>
        <div className="flex space-x-3">
          <button
            onClick={onStartChat}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Play className="w-4 h-4 mr-2" />
            Start Chat
          </button>
          {isEditing ? (
            <button
              onClick={handleSave}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              Edit Bot
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bot Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editedBot.name}
                onChange={(e) => setEditedBot({ ...editedBot, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600"
              />
            ) : (
              <p className="text-lg font-medium">{bot.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            {isEditing ? (
              <textarea
                value={editedBot.description}
                onChange={(e) => setEditedBot({ ...editedBot, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600"
              />
            ) : (
              <p className="text-gray-600 dark:text-gray-400">{bot.description}</p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Documents</h3>
            <div {...getRootProps()} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400">
              <input {...getInputProps()} />
              <PlusCircle className="w-12 h-12 mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Drag & drop documents here, or click to select files
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-gray-500 dark:text-gray-400">📄</div>
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(doc.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeDocument(doc.id)}
                    className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotDetails;