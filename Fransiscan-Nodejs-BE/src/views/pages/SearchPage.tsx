import React from 'react';
import GlobalSearch from '../components/GlobalSearch';
import '../components/GlobalSearch.css';

const SearchPage: React.FC = () => {
  return (
    <div className="search-page">
      <header className="bg-gray-800 text-white p-4">
        <h1 className="text-2xl font-bold">Franciscan Management System</h1>
      </header>
      
      <main className="container mx-auto p-4">
        <GlobalSearch />
      </main>
      
      <footer className="bg-gray-800 text-white p-4 mt-8">
        <p>&copy; 2025 Franciscan Management System. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default SearchPage;