import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { mfetchjson } from '../helper';
import { EditListForm } from '../pages/Lists/List';
import { List } from '../serverTypes';
import { MainState, saveToListModalClosed, snackAlert, snackAlertError } from '../slices/mainSlice';
import { RootState } from '../store';
import { ButtonClose } from './Button';
import Modal from './Modal';

const SaveToListModal = () => {
  const dispatch = useDispatch();
  const { open, toSaveItemId, toSaveItemType } = useSelector<RootState>(
    (state) => state.main.saveToListModal
  ) as MainState['saveToListModal'];
  const handleClose = () => dispatch(saveToListModalClosed());

  if (open) {
    return (
      <TheModal
        open={open}
        onClose={handleClose}
        toSaveItemId={toSaveItemId}
        toSaveItemType={toSaveItemType}
      />
    );
  }

  return null;
};

interface TheModalProps {
  open: boolean;
  onClose: () => void;
  toSaveItemId: unknown;
  toSaveItemType: unknown;
}

const TheModal = ({ open, onClose, toSaveItemId, toSaveItemType }: TheModalProps) => {
  const handleClose = onClose;

  const dispatch = useDispatch();

  const [page, setPage] = useState<'list' | 'new'>('list');

  const [prevCheckedLists, setPrevCheckedLists] = useState<number[] | null>(null); // List of list ids.
  useEffect(() => {
    const f = async () => {
      try {
        const ids = await mfetchjson(
          `/api/lists/_saved_to?id=${toSaveItemId}&type=${toSaveItemType}`
        );
        setPrevCheckedLists(ids);
      } catch (error) {
        dispatch(snackAlertError(error));
      }
    };
    f();
  }, [toSaveItemId, toSaveItemType, dispatch]);

  type ListState = {
    checked?: boolean;
    requestInProgress?: boolean;
  };

  type ListsState = {
    [key: number]: ListState;
  };

  const lists = useSelector<RootState>(
    (state) => state.main.lists.lists
  ) as MainState['lists']['lists'];
  const [listsState, setListsState] = useState<ListsState>({});
  const listsLoading = lists && listsState && lists.length !== Object.keys(listsState).length;
  useEffect(() => {
    if (prevCheckedLists === null) {
      return;
    }
    setListsState((prev) => {
      const newState = {
        ...prev,
      };
      for (const list of lists) {
        if (!prev[list.id]) {
          newState[list.id] = {
            checked: Boolean(prevCheckedLists.find((v) => v === list.id)),
            requestInProgress: false,
          };
        }
      }
      return newState;
    });
  }, [lists, prevCheckedLists]);
  const setListItemState = (listId: number, state: ListState) => {
    setListsState((prev) => {
      return {
        ...prev,
        [listId]: {
          ...prev[listId],
          ...state,
        },
      };
    });
  };
  const handleItemClick = async (list: List, event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setListItemState(list.id, {
      checked,
      requestInProgress: true,
    });
    try {
      await mfetchjson(`/api/lists/${list.id}/items`, {
        method: checked ? 'POST' : 'DELETE',
        body: JSON.stringify({
          targetId: toSaveItemId,
          targetType: toSaveItemType,
        }),
      });
      const alertText = checked ? `Saved to ${list.name}` : `Removed from ${list.name}`;
      dispatch(
        snackAlert(alertText, `${checked ? 'add' : 'remove'}_listitem_${list.name}_${toSaveItemId}`)
      );
    } catch (error) {
      setListItemState(list.id, {
        checked: !checked,
      });
      dispatch(snackAlertError(error));
    } finally {
      setListItemState(list.id, { requestInProgress: false });
    }
  };
  const renderListPage = () => {
    if (listsLoading) {
      return (
        <>
          <div className="modal-card-content">
            <div className="skeleton">
              <div className="skeleton-bar"></div>
              <div className="skeleton-bar"></div>
              <div className="skeleton-bar"></div>
              <div className="skeleton-bar"></div>
              <div className="skeleton-bar"></div>
            </div>
          </div>
        </>
      );
    }

    const renderList = () => {
      const renderItem = (list: List) => {
        const { name, displayName } = list;
        const htmlFor = `ch-${name}`;
        return (
          <div className="list-item" key={name}>
            <label htmlFor={htmlFor}>{displayName}</label>
            <input
              className="checkbox"
              id={htmlFor}
              type="checkbox"
              checked={listsState[list.id].checked}
              disabled={listsState[list.id].requestInProgress}
              onChange={(event) => handleItemClick(list, event)}
            />
          </div>
        );
      };
      const elements = lists.map((list) => renderItem(list));
      return <>{elements}</>;
    };
    return (
      <>
        <div className="modal-card-content">
          <div className="save-modal-list is-custom-scrollbar is-v2">{renderList()}</div>
        </div>
        <div className="modal-card-actions">
          <button onClick={() => setPage('new')}>Create new list</button>
        </div>
      </>
    );
  };

  const renderNewPage = () => {
    const switchTab = () => setPage('list');
    return <EditListForm onCancel={switchTab} onSuccess={switchTab} />;
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <div
        className={
          'modal-card save-modal is-compact-mobile' +
          (page === 'new' ? ' is-page-new' : '') +
          (page === 'list' ? ' is-page-list' : '')
        }
      >
        <div className="modal-card-head">
          <div className="modal-card-title">
            {page === 'list' && 'Save to'}
            {page === 'new' && 'Create list'}
          </div>
          <ButtonClose onClick={handleClose} />
        </div>
        {page === 'list' && renderListPage()}
        {page === 'new' && renderNewPage()}
      </div>
    </Modal>
  );
};

TheModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  toSaveItemId: PropTypes.string.isRequired,
  toSaveItemType: PropTypes.string.isRequired,
};

export default SaveToListModal;
