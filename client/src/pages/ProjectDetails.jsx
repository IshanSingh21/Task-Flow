import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Search, Filter, Trash2, Edit2, X } from 'lucide-react';
import api from '../services/api';

const COLUMNS = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function ProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState({
    TODO: [],
    IN_PROGRESS: [],
    IN_REVIEW: [],
    DONE: []
  });
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState('ALL');

  // New task form state
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskCol, setNewTaskCol] = useState('TODO');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');

  // Edit task modal state
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    fetchProjectAndTasks();
  }, [id]);

  const fetchProjectAndTasks = async () => {
    setLoading(true);
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks?limit=200`)
      ]);
      const proj = projRes.data.data.project;
      setProject(proj);

      // Fetch organization members to enable assignment
      if (proj.organizationId) {
        try {
          const membersRes = await api.get(`/organizations/${proj.organizationId}/members`);
          setMembers(membersRes.data.data.members || []);
        } catch (err) {
          console.error('Failed to fetch org members', err);
        }
      }

      const grouped = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
      tasksRes.data.data.tasks.forEach(task => {
        if (grouped[task.status]) {
          grouped[task.status].push(task);
        }
      });
      setTasks(grouped);
    } catch (error) {
      console.error('Failed to load project and tasks', error);
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
        fetchProjectAndTasks();
      }
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const payload = {
        title: newTaskTitle.trim(),
        status: newTaskCol,
        priority: newTaskPriority,
        ...(newTaskAssignee && { assigneeId: newTaskAssignee })
      };
      await api.post(`/projects/${id}/tasks`, payload);
      setNewTaskTitle('');
      setNewTaskAssignee('');
      setNewTaskPriority('MEDIUM');
      setShowNewTask(false);
      fetchProjectAndTasks();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create task');
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      await api.patch(`/tasks/${editingTask.id}`, {
        title: editingTask.title,
        description: editingTask.description,
        status: editingTask.status,
        priority: editingTask.priority,
        assigneeId: editingTask.assigneeId || null
      });
      setEditingTask(null);
      fetchProjectAndTasks();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      if (editingTask?.id === taskId) setEditingTask(null);
      fetchProjectAndTasks();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete task');
    }
  };

  const filterTask = (task) => {
    if (searchTerm) {
      const match = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!match) return false;
    }
    if (selectedPriority !== 'ALL' && task.priority !== selectedPriority) {
      return false;
    }
    if (selectedAssignee === 'UNASSIGNED') {
      if (task.assigneeId) return false;
    } else if (selectedAssignee !== 'ALL' && task.assigneeId !== selectedAssignee) {
      return false;
    }
    return true;
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Kanban board...</div>;
  if (!project) return <div className="p-8 text-center text-gray-500">Project not found.</div>;

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header & Meta */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-200 gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to={`/organizations/${project.organizationId}`} className="text-sm text-indigo-600 hover:underline">
              Projects
            </Link>
            <span className="text-gray-400">/</span>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          </div>
          {project.description && <p className="text-sm text-gray-500 mt-1">{project.description}</p>}
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={16} className="text-gray-400" />
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="border border-gray-300 rounded-md py-1.5 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="border border-gray-300 rounded-md py-1.5 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Assignees</option>
              <option value="UNASSIGNED">Unassigned</option>
              {members.map(m => (
                <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
              ))}
            </select>

            {(searchTerm || selectedPriority !== 'ALL' || selectedAssignee !== 'ALL') && (
              <button
                onClick={() => { setSearchTerm(''); setSelectedPriority('ALL'); setSelectedAssignee('ALL'); }}
                className="text-xs text-indigo-600 hover:text-indigo-800 underline px-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-6 h-full items-start min-w-max pb-4">
            {COLUMNS.map(colId => {
              const columnTasks = tasks[colId].filter(filterTask);
              return (
                <div key={colId} className="w-80 bg-gray-100 rounded-lg flex flex-col max-h-full">
                  <div className="p-3 font-semibold text-gray-700 text-sm flex justify-between items-center border-b border-gray-200">
                    <span>{colId.replace('_', ' ')}</span>
                    <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                      {columnTasks.length}
                    </span>
                  </div>

                  <Droppable droppableId={colId}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto p-2 min-h-[160px] ${snapshot.isDraggingOver ? 'bg-indigo-50' : ''}`}
                      >
                        {columnTasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white p-3 rounded shadow-sm border border-gray-200 mb-2 transition-shadow ${
                                  snapshot.isDragging ? 'shadow-lg border-indigo-400' : 'hover:shadow'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <p className="text-sm font-medium text-gray-900 leading-snug">{task.title}</p>
                                  <div className="flex items-center gap-1 opacity-60 hover:opacity-100">
                                    <button
                                      onClick={() => setEditingTask(task)}
                                      className="p-1 hover:text-indigo-600 rounded"
                                      title="Edit Task"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteTask(task.id)}
                                      className="p-1 hover:text-red-600 rounded"
                                      title="Delete Task"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>

                                {task.description && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                                )}

                                <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                    task.priority === 'URGENT'
                                      ? 'bg-red-100 text-red-800'
                                      : task.priority === 'HIGH'
                                      ? 'bg-orange-100 text-orange-800'
                                      : task.priority === 'MEDIUM'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {task.priority}
                                  </span>

                                  {task.assignee ? (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                                        {task.assignee.name.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="truncate max-w-[100px]">{task.assignee.name}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-gray-400 italic">Unassigned</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {showNewTask && newTaskCol === colId ? (
                          <form onSubmit={handleCreateTask} className="mt-2 bg-white p-3 rounded border border-indigo-400 shadow-sm space-y-2">
                            <input
                              type="text"
                              autoFocus
                              placeholder="Task title..."
                              value={newTaskTitle}
                              onChange={e => setNewTaskTitle(e.target.value)}
                              className="w-full text-sm border-b border-gray-200 pb-1 outline-none focus:border-indigo-500"
                            />
                            
                            <div className="flex gap-2">
                              <select
                                value={newTaskPriority}
                                onChange={e => setNewTaskPriority(e.target.value)}
                                className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50 flex-1"
                              >
                                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>

                              <select
                                value={newTaskAssignee}
                                onChange={e => setNewTaskAssignee(e.target.value)}
                                className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-gray-50 flex-1"
                              >
                                <option value="">Assignee...</option>
                                {members.map(m => (
                                  <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setShowNewTask(false)}
                                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="text-xs bg-indigo-600 text-white px-3 py-1 rounded font-medium hover:bg-indigo-700"
                              >
                                Add Task
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            onClick={() => {
                              setNewTaskCol(colId);
                              setShowNewTask(true);
                              setNewTaskTitle('');
                              setNewTaskAssignee('');
                              setNewTaskPriority('MEDIUM');
                            }}
                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 w-full p-2 rounded mt-1 transition-colors"
                          >
                            <Plus size={16} /> Add Task
                          </button>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </div>
      </DragDropContext>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Edit Task</h3>
              <button onClick={() => setEditingTask(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingTask.title}
                  onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editingTask.description || ''}
                  onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={editingTask.status}
                    onChange={e => setEditingTask({ ...editingTask, status: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {COLUMNS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={e => setEditingTask({ ...editingTask, priority: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Assignee</label>
                <select
                  value={editingTask.assigneeId || ''}
                  onChange={e => setEditingTask({ ...editingTask, assigneeId: e.target.value || null })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m.user.id} value={m.user.id}>{m.user.name} ({m.user.email})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => handleDeleteTask(editingTask.id)}
                  className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                >
                  <Trash2 size={14} /> Delete
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
