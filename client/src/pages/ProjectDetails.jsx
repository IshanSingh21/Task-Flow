import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import api from '../services/api';

const COLUMNS = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export default function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState({
    TODO: [],
    IN_PROGRESS: [],
    IN_REVIEW: [],
    DONE: []
  });
  const [loading, setLoading] = useState(true);
  
  // New task form state
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskCol, setNewTaskCol] = useState('TODO');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => {
    fetchProjectAndTasks();
  }, [id]);

  const fetchProjectAndTasks = async () => {
    setLoading(true);
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks?limit=100`) // Simplified without pagination for board
      ]);
      setProject(projRes.data.data.project);
      
      const grouped = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
      tasksRes.data.data.tasks.forEach(task => {
        if (grouped[task.status]) {
          grouped[task.status].push(task);
        }
      });
      setTasks(grouped);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const startCol = source.droppableId;
    const endCol = destination.droppableId;
    
    // Optimistic UI update
    const startTasks = Array.from(tasks[startCol]);
    const endTasks = startCol === endCol ? startTasks : Array.from(tasks[endCol]);
    
    const [movedTask] = startTasks.splice(source.index, 1);
    movedTask.status = endCol;
    endTasks.splice(destination.index, 0, movedTask);
    
    setTasks(prev => ({
      ...prev,
      [startCol]: startTasks,
      [endCol]: endTasks
    }));

    if (startCol !== endCol) {
      try {
        await api.patch(`/tasks/${draggableId}`, { status: endCol });
      } catch (err) {
        console.error('Failed to update task status', err);
        // Revert on failure
        fetchProjectAndTasks();
      }
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await api.post(`/projects/${id}/tasks`, {
        title: newTaskTitle,
        status: newTaskCol,
        priority: 'MEDIUM'
      });
      setNewTaskTitle('');
      setShowNewTask(false);
      fetchProjectAndTasks();
    } catch (err) {
      alert('Failed to create task');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading board...</div>;
  if (!project) return <div className="p-8 text-center text-gray-500">Project not found.</div>;

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        {project.description && <p className="text-sm text-gray-500 mt-1">{project.description}</p>}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-6 h-full items-start min-w-max pb-4">
            {COLUMNS.map(colId => (
              <div key={colId} className="w-80 bg-gray-100 rounded-lg flex flex-col max-h-full">
                <div className="p-3 font-semibold text-gray-700 text-sm flex justify-between items-center">
                  {colId.replace('_', ' ')}
                  <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                    {tasks[colId].length}
                  </span>
                </div>
                
                <Droppable droppableId={colId}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 overflow-y-auto p-2 min-h-[150px] ${snapshot.isDraggingOver ? 'bg-gray-200' : ''}`}
                    >
                      {tasks[colId].map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white p-3 rounded shadow-sm border border-gray-200 mb-2 ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                            >
                              <p className="text-sm font-medium text-gray-900">{task.title}</p>
                              <div className="flex justify-between items-center mt-3">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                                  task.priority === 'HIGH' || task.priority === 'URGENT' 
                                    ? 'bg-red-100 text-red-700' 
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {task.priority}
                                </span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      
                      {showNewTask && newTaskCol === colId ? (
                        <form onSubmit={handleCreateTask} className="mt-2 bg-white p-2 rounded border border-indigo-300">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Task title..."
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                            className="w-full text-sm outline-none mb-2"
                          />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setShowNewTask(false)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                            <button type="submit" className="text-xs bg-indigo-600 text-white px-2 py-1 rounded">Add</button>
                          </div>
                        </form>
                      ) : (
                        <button 
                          onClick={() => { setNewTaskCol(colId); setShowNewTask(true); setNewTaskTitle(''); }}
                          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 w-full p-2 rounded mt-1"
                        >
                          <Plus size={16} /> Add Task
                        </button>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
