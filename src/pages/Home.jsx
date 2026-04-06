import React, { useState } from 'react';
import ThemeToggle from '../components/ThemeToggle';
import SearchBar from '../components/SearchBar';
import HeroTimer from '../components/HeroTimer';
import AnnouncementTicker from '../components/AnnouncementTicker';
import SubjectGrid from '../components/SubjectGrid';
import SubjectModal from '../components/SubjectModal';
import DiagnosisQuest from '../components/DiagnosisQuest';
import StudyPlanner from '../components/StudyPlanner';
import { useFirestoreQuery } from '../hooks/useFirestoreQuery';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [highlightMaterialId, setHighlightMaterialId] = useState(null);

  // Fetch only subjects and announcements on initial load — with limit applied in hook
  const { data: announcements, loading: loadingAnnouncements } = useFirestoreQuery('announcements', 'date', 'desc');
  const { data: subjects, loading: loadingSubjects } = useFirestoreQuery('subjects', 'createdAt', 'asc');

  // materials and quests are NOT fetched here:
  // - materials: lazy-loaded inside SubjectModal on subject click
  // - quests: self-fetched inside DiagnosisQuest with localStorage caching

  return (
    <div className="min-h-screen pb-20 relative">
      <Navbar />

      <div className="w-full flex justify-center max-w-7xl mx-auto px-6 mt-2 mb-6 z-10 relative">
        <HeroTimer />
      </div>

      <main className="max-w-6xl mx-auto px-4 md:px-8 mt-4">

        {!loadingAnnouncements && <AnnouncementTicker announcements={announcements} />}

        <SearchBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          subjects={subjects}
          announcements={announcements}
        />

        <div className="mt-12">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-8 select-none">
            Your Subjects
          </h2>
          {!loadingSubjects && (
            <SubjectGrid
              subjects={subjects}
              onSubjectClick={(subject) => setSelectedSubject(subject)}
            />
          )}
        </div>

        <div className="mt-24 mb-12">
          <DiagnosisQuest />
        </div>

      </main>

      <section className="max-w-7xl mx-auto px-4 py-8">
        <StudyPlanner subjects={subjects} materials={[]} />
      </section>

      <SubjectModal
        isOpen={!!selectedSubject}
        onClose={() => { setSelectedSubject(null); setHighlightMaterialId(null); }}
        subjectData={selectedSubject}
        searchTerm={searchTerm}
        highlightMaterialId={highlightMaterialId}
      />
    </div>
  );
}
