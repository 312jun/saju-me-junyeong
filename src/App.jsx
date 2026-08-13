import MascotBuddy from './components/mascot/MascotBuddy'
import Sidebar from './components/layout/Sidebar'
import AppHeader from './components/layout/AppHeader'
import ProfileCard from './components/profile/ProfileCard'
import OnboardingModal from './components/profile/OnboardingModal'
import ProfileEditModal from './components/profile/ProfileEditModal'
import SajuForm from './components/readings/SajuForm'
import FormPreview from './components/readings/FormPreview'
import LoadingSkeleton from './components/readings/LoadingSkeleton'
import ResultPanel from './components/readings/ResultPanel'
import { useSajuApp } from './hooks/useSajuApp'
import './App.css'

export default function App() {
  const app = useSajuApp()

  return (
    <div className="layout">
      <Sidebar
        authLoading={app.authLoading}
        user={app.user}
        userLabel={app.userLabel}
        profile={app.profile}
        needsOnboarding={app.needsOnboarding}
        profileLoading={app.profileLoading}
        authError={app.authError}
        onOpenProfile={app.openProfileEditor}
        onSignOut={app.handleSignOut}
        onGoogleLogin={app.handleGoogleLogin}
        readings={app.readings}
        selectedId={app.selectedId}
        listLoading={app.listLoading}
        listError={app.listError}
        saving={app.saving}
        isGuest={app.isGuest}
        onNewReading={app.handleNewReading}
        onSelectReading={app.handleSelectReading}
        onDeleteReading={app.handleDelete}
      />

      <main className="app">
        <AppHeader
          profile={app.profile}
          needsOnboarding={app.needsOnboarding}
          user={app.user}
          onNewReading={app.handleNewReading}
        />

        {app.user && app.profile && (
          <ProfileCard profile={app.profile} onEdit={app.openProfileEditor} />
        )}

        {app.user && app.profileLoading && (
          <p className="status-line">프로필을 불러오는 중…</p>
        )}

        {app.showForm && (
          <>
            <SajuForm
              ref={app.formRef}
              name={app.name}
              setName={app.setName}
              birthDate={app.birthDate}
              setBirthDate={app.setBirthDate}
              birthTime={app.birthTime}
              setBirthTime={app.setBirthTime}
              gender={app.gender}
              setGender={app.setGender}
              calendarType={app.calendarType}
              setCalendarType={app.setCalendarType}
              filledCount={app.filledCount}
              formReady={app.formReady}
              profile={app.profile}
              selectedId={app.selectedId}
              loading={app.loading}
              saving={app.saving}
              blockedByProfile={app.blockedByProfile}
              nameInputRef={app.nameInputRef}
              onOpenProfile={app.openProfileEditor}
              onAnalyze={app.handleAnalyze}
              onUpdate={app.handleUpdate}
              onDelete={app.handleDelete}
            />
            <FormPreview
              name={app.name}
              birthDate={app.birthDate}
              birthTime={app.birthTime}
              age={app.age}
              calendarType={app.calendarType}
            />
          </>
        )}

        {app.error && (
          <p className="error" ref={app.errorRef} role="alert">
            {app.error}
          </p>
        )}

        {app.loading && <LoadingSkeleton />}

        {app.result && !app.loading && (
          <ResultPanel
            key={app.selectedId ?? 'live'}
            ref={app.resultRef}
            name={app.name}
            birthDate={app.birthDate}
            birthTime={app.birthTime}
            gender={app.gender}
            calendarType={app.calendarType}
            result={app.result}
            setResult={app.setResult}
            selectedId={app.selectedId}
            selectedReading={app.selectedReading}
            isGuest={app.isGuest}
            showLockedResult={app.showLockedResult}
            teaser={app.teaser}
            user={app.user}
            shareBusy={app.shareBusy}
            saving={app.saving}
            shareMessage={app.shareMessage}
            shareUrl={app.shareUrl}
            onGoogleLogin={app.handleGoogleLogin}
            onEnableShare={app.handleEnableShare}
            onCopyShareLink={app.handleCopyShareLink}
            onDisableShare={app.handleDisableShare}
          />
        )}
      </main>

      {app.needsOnboarding && app.user && (
        <OnboardingModal
          profileForm={app.profileForm}
          setProfileForm={app.setProfileForm}
          profileSaving={app.profileSaving}
          profileError={app.profileError}
          onSave={app.saveProfile}
        />
      )}

      {app.profileOpen && app.user && !app.needsOnboarding && (
        <ProfileEditModal
          profileForm={app.profileForm}
          setProfileForm={app.setProfileForm}
          profileSaving={app.profileSaving}
          profileError={app.profileError}
          onClose={() => app.setProfileOpen(false)}
          onSave={app.saveProfile}
        />
      )}

      {!app.mascotAway && (
        <MascotBuddy mood={app.loading ? 'loading' : app.mascotMood} />
      )}
    </div>
  )
}
