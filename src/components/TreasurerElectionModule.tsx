import React, { useState } from 'react';
import {
  Election,
  Candidate,
  VoteRecord,
  User,
  PsychTestScores,
} from '../types';
import {
  Vote,
  Award,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  UserCheck,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  PlusCircle,
  Lock,
} from 'lucide-react';

interface TreasurerElectionModuleProps {
  currentUser: User | null;
  election: Election;
  votes: VoteRecord[];
  onVote: (candidateId: string) => void;
  onAddCandidate: (candidate: Omit<Candidate, 'id' | 'votes_count'>) => void;
  onToggleElectionStatus: () => void;
  onNavigateToMembers?: () => void;
}

const PSYCH_QUESTIONS = [
  {
    key: 'kejujuran',
    title: '1. Integritas & Kejujuran Finansial',
    description: 'Bagaimana komitmen Anda dalam mencatat setiap rupiah kas masuk/keluar secara transparan tanpa ada selisih terselubung?',
    placeholder: 'Uraikan metode transparansi dan rekonsiliasi yang akan Anda terapkan...',
  },
  {
    key: 'ketegasan',
    title: '2. Ketegasan Penagihan & Aturan Denda',
    description: 'Bagaimana sikap Anda saat menagih teman dekat yang menunggak iuran kas dan menerapkan denda harian Rp500 secara adil?',
    placeholder: 'Uraikan cara komunikasi persuasif namun tetap tegas menegakkan aturan...',
  },
  {
    key: 'ketelitian',
    title: '3. Ketelitian Pembukuan & Rekonsiliasi Bank',
    description: 'Seberapa disiplin Anda dalam mencocokkan mutasi e-wallet, mengonversi setoran tunai, dan mengarsipkan bukti transfer?',
    placeholder: 'Uraikan jadwal rutin rekonsiliasi kas dan pelaporan mingguan...',
  },
  {
    key: 'pengambilan_keputusan',
    title: '4. Kebijakan Dana Talangan Darurat',
    description: 'Bagaimana Anda mengevaluasi urgensi pengajuan pinjaman safety net agar dana kas tidak defisit dan tepat sasaran?',
    placeholder: 'Uraikan kriteria kelayakan pinjaman darurat dan batas toleransi...',
  },
  {
    key: 'komitmen',
    title: '5. Dedikasi & Ketersediaan Waktu',
    description: 'Apakah Anda siap memegang amanah bendahara selama periode 1 tahun dan siap diaudit kapan saja oleh anggota?',
    placeholder: 'Uraikan komitmen waktu luang untuk mengurus operasional kas tongkrongan...',
  },
];

export const TreasurerElectionModule: React.FC<TreasurerElectionModuleProps> = ({
  currentUser,
  election,
  votes,
  onVote,
  onAddCandidate,
  onToggleElectionStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'ballot' | 'psych_test' | 'results'>('ballot');
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(election.candidates[0]?.id || null);

  // Psych test nomination form state
  const [visionMission, setVisionMission] = useState('');
  const [answers, setAnswers] = useState({
    q1: '',
    q2: '',
    q3: '',
    q4: '',
    q5: '',
  });
  const [candidateScores, setCandidateScores] = useState<PsychTestScores>({
    kejujuran: 90,
    ketegasan: 85,
    ketelitian: 90,
    pengambilan_keputusan: 85,
    komitmen: 90,
  });

  // Check if current user has voted
  const userVote = currentUser ? votes.find((v) => v.user_id === currentUser.id) : undefined;
  const totalVotes = votes.length;
  const isBendaharaOrAdmin = currentUser ? currentUser.role === 'bendahara' || currentUser.role === 'admin' : false;

  // Calculate winner if closed
  const sortedCandidates = [...election.candidates].sort((a, b) => b.votes_count - a.votes_count);
  const leaderCandidate = sortedCandidates[0];

  const handleNominateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Silakan tambahkan atau pilih profil anggota terlebih dahulu di tab Anggota.');
      return;
    }
    if (!visionMission.trim() || !answers.q1 || !answers.q2 || !answers.q3 || !answers.q4 || !answers.q5) {
      alert('Harap lengkapi visi-misi dan seluruh 5 instrumen psikotes.');
      return;
    }

    onAddCandidate({
      user_id: currentUser.id,
      user_name: currentUser.name,
      vision_mission: visionMission.trim(),
      scores: candidateScores,
      answers: {
        question_1: answers.q1,
        question_2: answers.q2,
        question_3: answers.q3,
        question_4: answers.q4,
        question_5: answers.q5,
      },
    });

    alert('Pendaftaran calon bendahara berhasil! Profil Anda kini tampil di surat suara.');
    setActiveTab('ballot');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                election.status === 'open'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : 'bg-slate-100 text-slate-700 border border-slate-300'
              }`}
            >
              {election.status === 'open' ? 'PEMILIHAN DIBUKA' : 'VOTING DITUTUP'}
            </span>
            <span className="text-xs text-[#727986]">• One-Man-One-Vote</span>
          </div>

          <h2 className="text-lg font-bold text-[#2B2F38] font-heading mt-1">{election.title}</h2>
          <p className="text-xs text-[#727986]">
            Total Suara Masuk: <strong className="text-[#2B2F38]">{totalVotes} Suara</strong>
          </p>
        </div>

        {isBendaharaOrAdmin && (
          <button
            onClick={onToggleElectionStatus}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors shrink-0"
          >
            {election.status === 'open' ? 'Tutup Periode Voting' : 'Buka Kembali Voting'}
          </button>
        )}
      </div>

      {/* Sub Navigation Tabs */}
      <div className="grid grid-cols-3 p-1 bg-[#F5F6F8] rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('ballot')}
          className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'ballot'
              ? 'bg-white text-[#118EEA] border border-slate-200'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Vote className="w-3.5 h-3.5" />
          <span>Surat Suara</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('psych_test')}
          className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'psych_test'
              ? 'bg-white text-[#118EEA] border border-slate-200'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileQuestion className="w-3.5 h-3.5" />
          <span>Psikotes Calon</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('results')}
          className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'results'
              ? 'bg-white text-[#118EEA] border border-slate-200'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Hasil Real-Time</span>
        </button>
      </div>

      {/* TAB 1: BALLOT & CANDIDATES */}
      {activeTab === 'ballot' && (
        <div className="space-y-4">
          {userVote && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Anda telah memberikan suara untuk:{' '}
                  <strong>{election.candidates.find((c) => c.id === userVote.candidate_id)?.user_name}</strong>
                </span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-600">Hak Suara Terpakai</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {election.candidates.map((cand) => {
              const isVoted = userVote?.candidate_id === cand.id;
              const isExpanded = expandedCandidate === cand.id;
              const avgScore = Math.round(
                (cand.scores.kejujuran +
                  cand.scores.ketegasan +
                  cand.scores.ketelitian +
                  cand.scores.pengambilan_keputusan +
                  cand.scores.komitmen) /
                  5
              );

              return (
                <div
                  key={cand.id}
                  className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                    isVoted ? 'border-2 border-[#118EEA]' : 'border-slate-200'
                  }`}
                >
                  <div className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#E7F3FE] text-[#118EEA] font-extrabold text-base flex items-center justify-center font-heading">
                          {cand.user_name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-[#2B2F38] font-heading">{cand.user_name}</h3>
                            {isVoted && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#118EEA] text-white">
                                PILIHAN ANDA
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#727986] mt-0.5">
                            Skor Psikotes Karakter: <strong className="text-[#118EEA]">{avgScore}/100</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedCandidate(isExpanded ? null : cand.id)}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1 transition-colors"
                        >
                          <span>{isExpanded ? 'Tutup Rincian' : 'Lihat Uji Karakter'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          id={`vote-candidate-btn-${cand.id}`}
                          disabled={election.status === 'closed'}
                          onClick={() => onVote(cand.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                            isVoted
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#118EEA] hover:bg-[#0B63C5] text-white disabled:bg-slate-300'
                          }`}
                        >
                          <Vote className="w-4 h-4" />
                          <span>{isVoted ? 'Terpilih' : 'Coblos Calon'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Vision statement */}
                    <div className="p-3.5 bg-[#F5F6F8] rounded-xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                        Visi & Program Kerja Kas:
                      </span>
                      <p className="text-xs text-[#2B2F38] leading-relaxed">{cand.vision_mission}</p>
                    </div>

                    {/* Expanded 5 Psychometric Traits & Answers */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-100 space-y-4">
                        <h4 className="text-xs font-bold text-[#2B2F38] uppercase tracking-wider">
                          Hasil Uji 5 Dimensi Karakter Bendahara
                        </h4>

                        {/* Trait bars */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-[#727986]">Kejujuran & Transparansi</span>
                              <span className="font-bold text-[#118EEA]">{cand.scores.kejujuran}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#118EEA]" style={{ width: `${cand.scores.kejujuran}%` }} />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-[#727986]">Ketegasan Penagihan</span>
                              <span className="font-bold text-[#118EEA]">{cand.scores.ketegasan}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#118EEA]" style={{ width: `${cand.scores.ketegasan}%` }} />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-[#727986]">Ketelitian Pembukuan</span>
                              <span className="font-bold text-[#118EEA]">{cand.scores.ketelitian}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#118EEA]" style={{ width: `${cand.scores.ketelitian}%` }} />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-[#727986]">Pengambilan Keputusan</span>
                              <span className="font-bold text-[#118EEA]">{cand.scores.pengambilan_keputusan}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#118EEA]"
                                style={{ width: `${cand.scores.pengambilan_keputusan}%` }}
                              />
                            </div>
                          </div>

                          <div className="space-y-1 sm:col-span-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-[#727986]">Komitmen & Integritas</span>
                              <span className="font-bold text-[#118EEA]">{cand.scores.komitmen}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#118EEA]" style={{ width: `${cand.scores.komitmen}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Candidate Responses to 5 Questions */}
                        <div className="space-y-2 pt-2">
                          <span className="text-xs font-bold text-slate-700 block">
                            Jawaban Instrumen Psikotes Calon:
                          </span>
                          <div className="space-y-2 text-xs">
                            <div className="p-3 bg-white rounded-xl border border-slate-200">
                              <p className="font-bold text-[#2B2F38]">1. Integritas & Transparansi Saldo:</p>
                              <p className="text-slate-600 mt-0.5">{cand.answers.question_1}</p>
                            </div>
                            <div className="p-3 bg-white rounded-xl border border-slate-200">
                              <p className="font-bold text-[#2B2F38]">2. Ketegasan Menagih Teman Menunggak:</p>
                              <p className="text-slate-600 mt-0.5">{cand.answers.question_2}</p>
                            </div>
                            <div className="p-3 bg-white rounded-xl border border-slate-200">
                              <p className="font-bold text-[#2B2F38]">3. Rekonsiliasi & Konversi Tunai:</p>
                              <p className="text-slate-600 mt-0.5">{cand.answers.question_3}</p>
                            </div>
                            <div className="p-3 bg-white rounded-xl border border-slate-200">
                              <p className="font-bold text-[#2B2F38]">4. Penilaian Pinjaman Safety Net:</p>
                              <p className="text-slate-600 mt-0.5">{cand.answers.question_4}</p>
                            </div>
                            <div className="p-3 bg-white rounded-xl border border-slate-200">
                              <p className="font-bold text-[#2B2F38]">5. Komitmen Masa Bakti 1 Tahun:</p>
                              <p className="text-slate-600 mt-0.5">{cand.answers.question_5}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: PSYCH TEST & NOMINATION FORM */}
      {activeTab === 'psych_test' && (
        <form onSubmit={handleNominateSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-5">
          <div>
            <h3 className="text-base font-bold text-[#2B2F38] font-heading">
              Form Uji Psikotes & Pencalonan Bendahara
            </h3>
            <p className="text-xs text-[#727986] mt-0.5">
              Isi 5 instrumen karakter kepengurusan kas tongkrongan untuk menguji kelayakan dan mendaftarkan diri sebagai calon bendahara.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Nama Calon</label>
            <input
              type="text"
              disabled
              value={currentUser.name}
              className="w-full px-3.5 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-[#2B2F38]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2B2F38] mb-1">Visi & Program Kerja Kas</label>
            <textarea
              rows={2}
              required
              value={visionMission}
              onChange={(e) => setVisionMission(e.target.value)}
              placeholder="Contoh: Digitalisasi pembukuan 100%, laporan H+0, dan perluasan pocket liburan pantai..."
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-[#2B2F38] focus:outline-none focus:border-[#118EEA]"
            />
          </div>

          {/* 5 Instrument Questions */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-[#2B2F38] uppercase tracking-wider text-slate-500">
              5 Instrumen Pertanyaan Karakter Bendahara (FR-2.1)
            </h4>

            {PSYCH_QUESTIONS.map((q, idx) => {
              const qKey = `q${idx + 1}` as keyof typeof answers;
              return (
                <div key={q.key} className="p-4 bg-[#F5F6F8] rounded-xl border border-slate-200 space-y-2">
                  <div>
                    <h5 className="text-xs font-bold text-[#2B2F38]">{q.title}</h5>
                    <p className="text-[11px] text-[#727986] mt-0.5">{q.description}</p>
                  </div>
                  <textarea
                    rows={2}
                    required
                    value={answers[qKey]}
                    onChange={(e) => setAnswers({ ...answers, [qKey]: e.target.value })}
                    placeholder={q.placeholder}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-[#2B2F38] focus:outline-none focus:border-[#118EEA]"
                  />
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#118EEA] hover:bg-[#0B63C5] text-white text-xs font-bold transition-colors"
          >
            Kirim Jawaban & Daftarkan Sebagai Calon Bendahara
          </button>
        </form>
      )}

      {/* TAB 3: REAL-TIME VOTING RESULTS (FR-2.3) */}
      {activeTab === 'results' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#2B2F38] font-heading">Perolehan Suara Pemilihan Bendahara</h3>
            <p className="text-xs text-[#727986]">Hasil rekapitulasi one-man-one-vote secara real-time</p>
          </div>

          {/* Winner Banner if closed or current leader */}
          {leaderCandidate && (
            <div className="p-4 bg-[#E7F3FE] rounded-xl border border-[#118EEA]/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#118EEA] text-white flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#118EEA] uppercase tracking-wide">
                    {election.status === 'closed' ? 'BENDAHARA TERPILIH' : 'KANDIDAT UNGGUL SEMENTARA'}
                  </span>
                  <h4 className="text-sm font-bold text-[#2B2F38] font-heading">{leaderCandidate.user_name}</h4>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-[#118EEA] font-heading">{leaderCandidate.votes_count}</span>
                <span className="text-xs text-[#727986]"> / {totalVotes} Suara</span>
              </div>
            </div>
          )}

          {/* Vote Percentage Progress Bars */}
          <div className="space-y-4">
            {election.candidates.map((cand) => {
              const percent = totalVotes > 0 ? Math.round((cand.votes_count / totalVotes) * 100) : 0;

              return (
                <div key={cand.id} className="p-4 bg-[#F5F6F8] rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#2B2F38]">{cand.user_name}</span>
                    <span className="font-extrabold text-[#118EEA]">
                      {cand.votes_count} Suara ({percent}%)
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#118EEA] transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
