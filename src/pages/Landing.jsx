import { Navigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import GoogleArcs from '../components/layout/GoogleArcs.jsx';
import FullPageSpinner from '../components/ui/FullPageSpinner.jsx';
import { CreateWorkspaceForm } from '../components/CreateWorkspaceModal.jsx';
import { WorkspaceArt } from '../components/illustrations/Illustrations.jsx';
import { firstName, greeting } from '../lib/utils.js';

// "/" -> open the most recent workspace, or onboard the user into their first one
export default function Landing() {
  const { workspaces, loading } = useWorkspace();
  const { user } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (workspaces.length) return <Navigate to={`/w/${workspaces[0]._id}`} replace />;

  return (
    <div className="relative min-h-full overflow-hidden">
      <GoogleArcs />
      <div className="relative px-6 py-10 sm:px-14 sm:py-14">
        <h1 className="text-[28px] font-normal text-ink">{greeting()}, {firstName(user?.name)}</h1>
        <p className="mt-1 max-w-xl text-[26px] font-light leading-snug text-ink-5">Your TeamCollab account has been created</p>
        <p className="mt-12 text-[13px] text-gblue">Create a workspace to start collaborating with your team</p>

        <div className="mt-8 grid max-w-3xl gap-8 rounded-2xl bg-white p-8 shadow-float md:grid-cols-[180px_1fr]">
          <div>
            <span className="chip bg-ink text-white">2 MINUTES</span>
            <div className="mt-6 h-28 w-36">
              <WorkspaceArt />
            </div>
          </div>
          <CreateWorkspaceForm />
        </div>
      </div>
    </div>
  );
}
