import React, {
  useState, useEffect, useRef, useMemo,
} from 'react';
import { TodosList } from './components/TodosList';
import {
  getTodos, addTodo, removeTodo, updateTodo,
} from './api/todos';
import { Todo } from './types/Todo';
import { UserWarning } from './UserWarning';
import { Navigation } from './components/Navigation';
import { ErrorNotification } from './components/ErrorNotification';
import { TodoStatus } from './types/TodoStatus';

const USER_ID = 5760;

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const newTodoField = useRef<HTMLInputElement>(null);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [messageError, setMessageError] = useState<string>('');
  const [status, setStatus] = useState<TodoStatus>(TodoStatus.All);
  const [textField, setTextField] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!USER_ID) {
    return <UserWarning />;
  }

  const handleDelete = (todoId: number) => {
    setTodos((prev: Todo[]) => prev.filter((todo) => todo.id !== todoId));
  };

  const handleUpdate = (todoToUpdate: Todo, title?: string) => {
    setTodos((prev: Todo[]) => prev.map(todo => {
      if (todo.id === todoToUpdate.id) {
        updateTodo(USER_ID, todoToUpdate, title);

        const requestBody = title
          ? { ...todo, title }
          : { ...todo, completed: !todo.completed };

        return requestBody;
      }

      return todo;
    }));
  };

  const submitAction = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();

    if (!textField.trim()) {
      setMessageError("Title can't be empty");

      return;
    }

    setIsProcessing(true);

    try {
      setTempTodo({
        id: 0,
        title: textField,
        userId: USER_ID,
        completed: false,
      });

      const newTodo = await addTodo(USER_ID, {
        title: textField,
        userId: USER_ID,
        completed: false,
      });

      setTempTodo(null);
      setTodos((prev: any) => [...prev, newTodo]);
    } catch {
      setMessageError('Unable to add todo');
    } finally {
      setIsProcessing(false);
      setTextField('');
    }
  };

  const toggleAllHandler = () => {
    const allCompleted = todos.every(item => item.completed);

    const updateTodoStatus = async (state: boolean) => {
      const todosToUpdate = todos
        .filter(item => (state ? !item.completed : item.completed));

      setTodos(prev => prev.map(todo => {
        if (todo.completed !== state) {
          return {
            ...todo,
            isFetching: true,
          };
        }

        return todo;
      }));

      try {
        const todoUpdateList = todosToUpdate.map(item => {
          return updateTodo(USER_ID, item)
            .then(res => res)
            .catch(() => {
              throw new Error('Unable to update todos');
            });
        });

        await Promise.all(todoUpdateList);

        getTodos(USER_ID)
          .then(loadedTodos => {
            setTodos(() => loadedTodos.map(todo => {
              return state ? todo : { ...todo, completed: false };
            }));
          })
          .catch(() => {
            throw new Error('Unable to retrieve todos');
          });
      } catch (error) {
        setMessageError('Unable to update todos');
        setTodos(prev => prev.map(todo => {
          if (todosToUpdate.find(item => item.id === todo.id)) {
            return { ...todo, isFetching: false };
          }

          return todo;
        }));
      }
    };

    if (!allCompleted) {
      updateTodoStatus(true);

      return;
    }

    updateTodoStatus(false);
  };

  /* eslint-disable react-hooks/rules-of-hooks */
  useEffect(() => {
    if (USER_ID) {
      getTodos(USER_ID)
        .then((loadedTodos) => {
          setTodos(loadedTodos);
        })
        .catch(() => {
          setMessageError('Unable to fetch data');
        });
    }
  }, [USER_ID]);

  const filterStatus = (value: TodoStatus, setOfTodos: Todo[]) => {
    const filteredTodos = useMemo(() => {
      switch (value) {
        case TodoStatus.All:
          return todos;

        case TodoStatus.Active:
          return todos.filter((todo: Todo) => !todo.completed);

        case TodoStatus.Completed:
          return todos.filter((todo: Todo) => todo.completed);

        default:
          throw Error('Specify your status');
      }
    }, [setOfTodos, value]);

    return filteredTodos;
  };

  const updatedTodos = filterStatus(status, todos);
  const completedTodos = todos.filter((todo: Todo) => todo.completed);
  const activeTodos = todos.filter((todo: Todo) => !todo.completed);

  const removeCompletedTodos = async () => {
    try {
      setTodos(todos
        .map(todo => (todo.completed ? { ...todo, isFetching: true } : todo)));

      await Promise.all(completedTodos.map(todo => removeTodo(todo.id)));

      setTodos(prev => prev.filter(todo => !todo.completed));
    } catch {
      setMessageError('Unable to delete todos');
    } finally {
      setTodos(prev => prev
        .map(todo => (todo.completed ? { ...todo, isFetching: false } : todo)));
    }
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          <button
            data-cy="ToggleAllButton"
            type="button"
            className="todoapp__toggle-all active"
            aria-label="Mark all as complete"
            onClick={toggleAllHandler}
          />

          <form>
            <input
              data-cy="NewTodoField"
              type="text"
              disabled={isProcessing}
              ref={newTodoField}
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={textField}
              onChange={(event) => setTextField(event.target.value)}
              onKeyDown={submitAction}
            />
          </form>
        </header>

        {!!todos.length && (
          <TodosList
            setOfItems={updatedTodos}
            deleteItem={handleDelete}
            tempTodo={tempTodo}
            setMessageError={setMessageError}
            isProcessing={isProcessing}
            handleUpdate={handleUpdate}
          />
        )}

        {!!todos.length && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="todosCounter">
              {activeTodos.length}
              {' '}
              items left
            </span>

            <Navigation
              changeStatus={setStatus}
              status={status}
            />

            <button
              data-cy="ClearCompletedButton"
              type="button"
              className="todoapp__clear-completed"
              onClick={removeCompletedTodos}
              disabled={completedTodos.length === 0}
            >
              Clear completed
            </button>

          </footer>
        )}
      </div>

      {!!messageError.length && (
        <ErrorNotification
          message={messageError}
          setMessage={setMessageError}
        />
      )}
    </div>
  );
};
