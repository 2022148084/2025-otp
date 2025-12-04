import { Box, Container, Text, SimpleGrid, Card, Heading, Spinner, Center, Badge, HStack, Icon, Button } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { FiFile, FiImage, FiVideo } from "react-icons/fi"

import useAuth from "@/hooks/useAuth"
import { FilesService, type FilePublic } from "@/client"
import {
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

type FileType = "text" | "image" | "video"

function Dashboard() {
  const { user: currentUser } = useAuth()
  const [selectedFile, setSelectedFile] = useState<FilePublic | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data: filesData, isLoading, error } = useQuery({
    queryKey: ["files"],
    queryFn: () => FilesService.readFiles({ limit: 3 }),
  })

  const files = filesData?.data || []

  const getFileType = (filename: string): FileType => {
    const ext = filename.split(".").pop()?.toLowerCase()
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) {
      return "image"
    }
    if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext || "")) {
      return "video"
    }
    return "text"
  }

  const getFileIcon = (type: FileType) => {
    switch (type) {
      case "image":
        return FiImage
      case "video":
        return FiVideo
      default:
        return FiFile
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const truncateText = (text: string | null | undefined, maxLength: number) => {
    if (!text) return "텍스트 없음"
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text
  }

  const handleFileClick = (file: FilePublic) => {
    // 모든 파일을 모달로 표시
    setSelectedFile(file)
    setIsModalOpen(true)
  }

  return (
    <Container maxW="full">
      <Box pt={12} m={4}>
        <Text fontSize="2xl" truncate maxW="sm">
          Hi, {currentUser?.full_name || currentUser?.email} 👋🏼
        </Text>
        <Text mb={8}>Welcome back, nice to see you again!</Text>

        <Heading size="lg" mb={6}>
          내 파일 목록
        </Heading>

        {isLoading && (
          <Center py={10}>
            <Spinner size="xl" />
          </Center>
        )}

        {error && (
          <Center py={10}>
            <Text color="red.500">파일을 불러오는 중 오류가 발생했습니다.</Text>
          </Center>
        )}

        {!isLoading && !error && files.length === 0 && (
          <Center py={10}>
            <Box textAlign="center">
              <Text fontSize="lg" color="gray.500">
                아직 업로드된 파일이 없습니다
              </Text>
              <Text fontSize="sm" color="gray.400" mt={2}>
                파일을 업로드하여 시작하세요
              </Text>
            </Box>
          </Center>
        )}

        {!isLoading && !error && files.length > 0 && (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
            {files.map((file: FilePublic) => {
              const fileType = getFileType(file.filename)
              const FileIcon = getFileIcon(fileType)

              return (
                <Card.Root
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  cursor="pointer"
                  _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
                  transition="all 0.2s"
                >
                  <Card.Body>
                    <HStack mb={2} gap={2}>
                      <Icon fontSize="xl" color="gray.500">
                        <FileIcon />
                      </Icon>
                      <Heading
                        size="md"
                        truncate
                        flex="1"
                      >
                        {file.filename}
                      </Heading>
                    </HStack>
                    <Badge colorScheme="blue" mb={3}>
                      {formatDate(file.created_at)}
                    </Badge>
                    <Text
                      fontSize="sm"
                      color="gray.600"
                      lineClamp={3}
                    >
                      {truncateText(file.extracted_text, 150)}
                    </Text>
                  </Card.Body>
                </Card.Root>
              )
            })}
          </SimpleGrid>
        )}
      </Box>

      {/* File Preview Modal */}
      <DialogRoot open={isModalOpen} onOpenChange={(e) => setIsModalOpen(e.open)} size="xl">
        <DialogBackdrop />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedFile?.filename}</DialogTitle>
          </DialogHeader>
          <DialogCloseTrigger />
          <DialogBody maxH="70vh" overflowY="auto">
            <Box>
              <Text whiteSpace="pre-wrap" fontSize="sm" mb={4}>
                {selectedFile?.extracted_text || "텍스트를 불러올 수 없습니다."}
              </Text>

              {selectedFile?.file_url && (
                <Button
                  colorScheme="blue"
                  size="md"
                  onClick={() => selectedFile.file_url && window.open(selectedFile.file_url, "_blank")}
                  mt={4}
                >
                  원본 파일 보기
                </Button>
              )}
            </Box>
          </DialogBody>
        </DialogContent>
      </DialogRoot>
    </Container>
  )
}
