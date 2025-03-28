import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Bot, MoreVertical, Trash2, Edit2, Play } from 'lucide-react';

interface BotListProps {
  onSelectBot: (bot: any) => void;
  onCreateBot: () => void;
}

const BotList: React.FC<BotListProps> = ({ onSelectBot, onCreateBot }) => {
  const [bots, setBots] = useState([
    {
      id: '1',
      name: 'Customer Support Bot',
      description: 'Handles general customer inquiries',
      status: 'active',
      documentCount: 5,
      lastActive: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Sales Assistant',
      description: 'Helps with product recommendations',
      status: 'inactive',
      documentCount: 3,
      lastActive: new Date().toISOString()
    }
  ]);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(bots);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setBots(items);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Your Bots</h2>
        <button
          onClick={onCreateBot}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create New Bot
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="bots">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-4"
            >
              {bots.map((bot, index) => (
                <Draggable key={bot.id} draggableId={bot.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            <div>
                              <h3 className="font-medium text-lg">{bot.name}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {bot.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onSelectBot(bot)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                            >
                              <Play className="w-5 h-5 text-green-600" />
                            </button>
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                              <Edit2 className="w-5 h-5 text-gray-500" />
                            </button>
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                              <Trash2 className="w-5 h-5 text-red-500" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span className={`px-2 py-1 rounded-full ${
                            bot.status === 'active' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {bot.status.charAt(0).toUpperCase() + bot.status.slice(1)}
                          </span>
                          <span>{bot.documentCount} documents</span>
                          <span>Last active: {new Date(bot.lastActive).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default BotList;