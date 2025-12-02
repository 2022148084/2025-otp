import { create } from 'zustand'

// 백엔드에서 받는 데이터 타입 정의 (대충 맞춰둠 ㅁㄴㅇㄹ 살려줘)
interface AnalysisData {
  metadata: any
  personas: any
  courses: any
}

interface AnalysisStore {
  analysisData: AnalysisData | null
  setAnalysisData: (data: AnalysisData) => void
}

export const useAnalysisStore = create<AnalysisStore>((set) => ({
  analysisData: null,
  setAnalysisData: (data) => set({ analysisData: data }),
}))