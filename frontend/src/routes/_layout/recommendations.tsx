import {
  Box,
  Button,
  Container,
  Heading,
  Input,
  Text,
  VStack,
  Icon,
} from "@chakra-ui/react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMutation } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { FiUploadCloud, FiFileText } from "react-icons/fi"

// Chakra UI v3 Toaster
import { toaster } from "@/components/ui/toaster"

// API 클라이언트 & 스토어
import { FilesService } from "../../client"
import { useAnalysisStore } from "../../store/analysisStore"

export const Route = createFileRoute("/_layout/recommendations")({
  component: Recommendations,
})

function Recommendations() {
  const [file, setFile] = useState<File | null>(null)
  const navigate = useNavigate()
  
  // [수정 1] 스토어에서 초기화 함수 가져오기
  const { setAnalysisData, setResultData } = useAnalysisStore()

  // [수정 2] 페이지 진입 시 기존 데이터 초기화 (꼬임 방지)
  useEffect(() => {
    setAnalysisData(null as any)
    setResultData(null)
    setFile(null)
  }, [])

  // 허용된 확장자 목록
  const ALLOWED_EXTENSIONS = ["txt", "png", "jpg", "jpeg", "heic", "mp4", "mov", "avi"]

  const uploadMutation = useMutation({
    mutationFn: (fileToUpload: File) => {
      // [수정 3] 업로드 시작 직전에도 확실하게 데이터 비우기
      setAnalysisData(null as any)
      setResultData(null)

      return FilesService.createFile({
        formData: {
          file: fileToUpload,
        },
      })
    },
    onSuccess: (data) => {
      toaster.create({
        title: "업로드 성공!",
        description: "AI가 내용을 분석하여 지도를 생성합니다.",
        type: "success",
        duration: 3000,
      })
      
      navigate({ to: "/result", search: { fileId: data.id } })
    },
    onError: (err) => {
      console.error(err)
      toaster.create({
        title: "업로드 실패",
        description: err.message || "파일을 다시 확인해주세요.",
        type: "error",
        duration: 5000,
      })
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    
    if (!selectedFile) return

    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase()

    if (!fileExtension || !ALLOWED_EXTENSIONS.includes(fileExtension)) {
      toaster.create({
        title: "지원하지 않는 파일 형식입니다.",
        description: "텍스트(.txt), 이미지, 동영상 파일만 업로드 가능합니다.",
        type: "error",
        duration: 3000,
      })
      e.target.value = "" 
      return
    }

    setFile(selectedFile)
  }

  const handleSubmit = () => {
    if (!file) {
      toaster.create({
        title: "파일을 선택해주세요.",
        description: "분석할 파일(텍스트, 이미지, 동영상)이 필요합니다.",
        type: "warning",
      })
      return
    }
    uploadMutation.mutate(file)
  }

  return (
    <Container maxW="container.md" py={12}>
      <VStack gap={8} align="stretch"> 
        <Box textAlign="center" mb={4}>
          <Heading size="xl" mb={4} color="teal.600">
            여행/약속 코스 추천
          </Heading>
          <Text fontSize="lg" color="gray.600">
            여행 계획, 약속 대화 내용, 혹은 관련 이미지/영상을 올려주세요.<br />
            AI가 최적의 장소를 찾아 지도에 표시해 드립니다.
          </Text>
        </Box>

        <Box
          border="3px dashed"
          borderColor={file ? "teal.400" : "gray.300"}
          borderRadius="xl"
          bg={file ? "teal.50" : "gray.50"}
          p={10}
          textAlign="center"
          transition="all 0.2s"
          _hover={{ borderColor: "teal.500", bg: "gray.100" }}
          position="relative"
        >
          <Icon as={file ? FiFileText : FiUploadCloud} w={12} h={12} color="teal.500" mb={4} />
          
          <Input
            type="file"
            accept=".txt, .png, .jpg, .jpeg, .heic, .mp4, .mov, .avi"
            onChange={handleFileChange}
            height="100%"
            width="100%"
            position="absolute"
            top="0"
            left="0"
            opacity="0"
            cursor="pointer"
            zIndex={2}
          />
          
          <VStack gap={2}>
            <Text fontWeight="bold" fontSize="lg">
              {file ? file.name : "여기를 클릭하여 파일 업로드"}
            </Text>
            <Text fontSize="sm" color="gray.500">
              {file 
                ? `${(file.size / 1024 / 1024).toFixed(2)} MB` 
                : "텍스트, 이미지, 동영상 파일을 지원합니다."}
            </Text>
          </VStack>
        </Box>

        <Button
          colorPalette="teal"
          colorScheme="teal"
          size="lg"
          height="60px"
          fontSize="xl"
          onClick={handleSubmit}
          loading={uploadMutation.isPending}
          loadingText={
            file?.name.endsWith(".mp4") || file?.name.endsWith(".mov") || file?.name.endsWith(".avi")
              ? "동영상 분석 중... (시간이 조금 걸립니다)"
              : "AI가 열심히 분석 중..."
          }
          disabled={!file}
          boxShadow="lg"
          _hover={{ transform: "translateY(-2px)", boxShadow: "xl" }}
        >
          분석 시작하기
        </Button>
      </VStack>
    </Container>
  )
}