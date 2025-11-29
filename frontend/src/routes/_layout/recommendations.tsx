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
import { useState } from "react"
import { FiUploadCloud, FiFileText } from "react-icons/fi"

// [수정] Chakra UI v3 Toaster 임포트
// (만약 경로 에러가 난다면 "@/components/ui/toaster" 또는 "@chakra-ui/react" 확인 필요)
import { toaster } from "@/components/ui/toaster"

// API 클라이언트
import { FilesService } from "../../client"

export const Route = createFileRoute("/_layout/recommendations")({
  component: Recommendations,
})

function Recommendations() {
  const [file, setFile] = useState<File | null>(null)
  const navigate = useNavigate()

  const uploadMutation = useMutation({
    mutationFn: (fileToUpload: File) => {
      return FilesService.createFile({
        formData: {
          file: fileToUpload,
        },
      })
    },
    onSuccess: (data) => {
      // [수정] alert -> toaster (성공)
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
      // [수정] alert -> toaster (에러)
      toaster.create({
        title: "업로드 실패",
        description: err.message || "파일을 다시 확인해주세요.",
        type: "error",
        duration: 5000,
      })
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = () => {
    if (!file) {
      // [수정] alert -> toaster (경고)
      toaster.create({
        title: "파일을 선택해주세요.",
        description: "분석할 텍스트 파일이 필요합니다.",
        type: "warning",
      })
      return
    }
    uploadMutation.mutate(file)
  }

  return (
    <Container maxW="container.md" py={12}>
      {/* v3 호환: spacing -> gap */}
      <VStack gap={8} align="stretch"> 
        <Box textAlign="center" mb={4}>
          <Heading size="xl" mb={4} color="teal.600">
            ✈️ 여행 코스 추천받기
          </Heading>
          <Text fontSize="lg" color="gray.600">
            여행 계획이나 대화 내용이 담긴 텍스트 파일(.txt)을 올려주세요.<br />
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
            accept=".txt"
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
              {file ? `${(file.size / 1024).toFixed(2)} KB` : "또는 파일을 드래그해서 놓으세요 (.txt only)"}
            </Text>
          </VStack>
        </Box>

        <Button
          colorPalette="teal"
          size="lg"
          height="60px"
          fontSize="xl"
          onClick={handleSubmit}
          loading={uploadMutation.isPending}
          loadingText="AI가 열심히 분석 중..."
          disabled={!file}
          boxShadow="lg"
          _hover={{ transform: "translateY(-2px)", boxShadow: "xl" }}
        >
          분석 시작하기 🚀
        </Button>
      </VStack>
    </Container>
  )
}