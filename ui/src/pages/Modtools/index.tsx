import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useDispatch, useSelector } from 'react-redux';
import {
  Link,
  Redirect,
  Route,
  Switch,
  useLocation,
  useParams,
  useRouteMatch,
} from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { APIError, mfetch } from '../../helper';
import { communityAdded, selectCommunity } from '../../slices/communitiesSlice';
import { MainState, snackAlertError } from '../../slices/mainSlice';
import { RootState } from '../../store';
import Forbidden from '../Forbidden';
import PageNotLoaded from '../PageNotLoaded';
import Banned from './Banned';
import Mods from './Mods';
import Removed from './Removed';
import Reports from './Reports';
import Rules from './Rules';
import Settings from './Settings';

function isActiveCls(className: string, isActive: boolean, activeClass = 'is-active') {
  return className + (isActive ? ` ${activeClass}` : '');
}

const Modtools = () => {
  const dispatch = useDispatch();
  const { name: communityName } = useParams<{ [key: string]: string }>();

  // Modtools resides in a protected router; hence there is always a logged in user.
  const user = (useSelector<RootState>((state) => state.main.user) as MainState['user'])!;

  const community = useSelector(selectCommunity(communityName));
  const [loading, setLoading] = useState(community ? 'loaded' : 'loading');
  useEffect(() => {
    if (community) return;
    (async () => {
      setLoading('loading');
      try {
        const res = await mfetch(`/api/communities/${communityName}?byName=true`);
        if (!res.ok) {
          if (res.status === 404) {
            setLoading('notfound');
            return;
          }
          throw new APIError(res.status, await res.json());
        }
        const rcomm = await res.json();
        dispatch(communityAdded(rcomm));
        setLoading('loaded');
      } catch (error) {
        setLoading('error');
        dispatch(snackAlertError(error));
      }
    })();
  }, [communityName, community, dispatch]);

  const { path } = useRouteMatch();
  const { pathname } = useLocation();

  if (loading !== 'loaded') {
    return <PageNotLoaded loading={loading} />;
  }

  if (!(community.userMod || (user && user.isAdmin))) {
    return <Forbidden />;
  }

  return (
    <div className="page-content wrap modtools">
      <Helmet>
        <title>Modtools</title>
      </Helmet>
      <Sidebar />
      <div className="modtools-head">
        <h1>
          <Link to={`/${communityName}`}>{communityName} </Link>Modtools
        </h1>
      </div>
      <div className="modtools-dashboard">
        <div className="sidebar">
          <Link
            className={isActiveCls('sidebar-item', pathname === '/modtools/settings')}
            to={`/${communityName}/modtools/settings`}
          >
            Community settings
          </Link>
          <div className="sidebar-topic">Content</div>
          <Link
            className={isActiveCls('sidebar-item', pathname === '/modtools/reports')}
            to={`/${communityName}/modtools/reports`}
          >
            Reports
          </Link>
          <Link
            className={isActiveCls('sidebar-item', pathname === '/modtools/removed')}
            to={`/${communityName}/modtools/removed`}
          >
            Removed
          </Link>
          <Link
            className={isActiveCls('sidebar-item', pathname === '/modtools/locked')}
            to={`/${communityName}/modtools/locked`}
          >
            Locked
          </Link>
          <div className="sidebar-topic">Users</div>
          <Link
            className={isActiveCls('sidebar-item', pathname === '/modtools/banned')}
            to={`/${communityName}/modtools/banned`}
          >
            Banned
          </Link>
          <Link
            className={isActiveCls('sidebar-item', pathname === '/modtools/mods')}
            to={`/${communityName}/modtools/mods`}
          >
            Moderators
          </Link>
          <div className="sidebar-topic">Rules</div>
          <Link
            className={isActiveCls('sidebar-item', pathname === '/modtools/rules')}
            to={`/${communityName}/modtools/rules`}
          >
            Rules
          </Link>
        </div>
        <Switch>
          <Route exact path={path}>
            <Redirect to={`/${communityName}/modtools/settings`} />
          </Route>
          <Route exact path={`${path}/settings`}>
            <Settings community={community} />
          </Route>
          <Route path={`${path}/reports`}>
            <Reports community={community} />
          </Route>
          <Route path={`${path}/removed`}>
            <Removed community={community} filter="deleted" title="Removed" />
          </Route>
          <Route path={`${path}/locked`}>
            <Removed community={community} filter="locked" title="Locked" />
          </Route>
          <Route path={`${path}/banned`}>
            <Banned community={community} />
          </Route>
          <Route path={`${path}/mods`}>
            <Mods community={community} />
          </Route>
          <Route path={`${path}/rules`}>
            <Rules community={community} />
          </Route>
          <Route path="*">
            <div className="modtools-content flex flex-center">Not found.</div>
          </Route>
        </Switch>
      </div>
    </div>
  );
};

export default Modtools;
